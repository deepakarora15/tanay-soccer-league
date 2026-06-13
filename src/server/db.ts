import fs from 'fs';
import path from 'path';

/**
 * Simple file-based JSON database.
 * Stores all data in a single JSON file for simplicity.
 * Provides a synchronous API similar to better-sqlite3.
 */

const dataDir = path.resolve(process.cwd(), 'data');
fs.mkdirSync(dataDir, { recursive: true });

const DB_PATH = path.join(dataDir, 'league.json');

// ─── Database State ─────────────────────────────────────────────────────────

interface DbState {
  users: any[];
  tournaments: any[];
  leagues: any[];
  matches: any[];
  predictions: any[];
  favorites: any[];
  feedEvents: any[];
  newsArticles: any[];
  notifications: any[];
}

let state: DbState = {
  users: [],
  tournaments: [],
  leagues: [],
  matches: [],
  predictions: [],
  favorites: [],
  feedEvents: [],
  newsArticles: [],
  notifications: [],
};

// Load existing data
if (fs.existsSync(DB_PATH)) {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    state = JSON.parse(raw);
  } catch {
    // Corrupted file, start fresh
  }
}

function save(): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

// ─── Query Helpers ──────────────────────────────────────────────────────────

function getCollection(sql: string): any[] {
  const lower = sql.toLowerCase();
  if (lower.includes('from user') || lower.includes('into user') || lower.includes('update user')) return state.users;
  if (lower.includes('from tournament') || lower.includes('into tournament') || lower.includes('update tournament')) return state.tournaments;
  if (lower.includes('from league') || lower.includes('into league') || lower.includes('update league')) return state.leagues;
  if (lower.includes('from match') || lower.includes('into match') || lower.includes('update match')) return state.matches;
  if (lower.includes('from prediction') || lower.includes('into prediction') || lower.includes('update prediction')) return state.predictions;
  if (lower.includes('from favorite') || lower.includes('into favorite') || lower.includes('update favorite')) return state.favorites;
  if (lower.includes('from feedevent') || lower.includes('into feedevent') || lower.includes('update feedevent')) return state.feedEvents;
  if (lower.includes('from newsarticle') || lower.includes('into newsarticle') || lower.includes('update newsarticle')) return state.newsArticles;
  if (lower.includes('from notification') || lower.includes('into notification') || lower.includes('update notification')) return state.notifications;
  return [];
}

function matchesWhere(item: any, conditions: { field: string; value: any; op: string }[]): boolean {
  return conditions.every(c => {
    const val = item[c.field];
    if (c.op === '=') return val === c.value;
    if (c.op === '!=') return val !== c.value;
    if (c.op === 'IN') return (c.value as any[]).includes(val);
    if (c.op === '>=') return val >= c.value;
    if (c.op === '<=') return val <= c.value;
    return true;
  });
}

// ─── SQL-like API (simplified) ──────────────────────────────────────────────

const db = {
  prepare(sql: string) {
    return {
      run(...params: any[]) {
        const lower = sql.toLowerCase().trim();
        
        // INSERT
        if (lower.startsWith('insert')) {
          const collection = getCollection(sql);
          
          // Parse column names from SQL
          const colMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
          if (!colMatch) return { changes: 0 };
          
          const columns = colMatch[1].split(',').map(c => c.trim());
          const obj: any = {};
          columns.forEach((col, i) => {
            obj[col] = params[i] !== undefined ? params[i] : null;
          });
          
          // Handle INSERT OR REPLACE (upsert by unique constraint)
          if (lower.includes('or replace')) {
            // For predictions: unique on playerId+matchId
            if (lower.includes('prediction')) {
              const idx = collection.findIndex((p: any) => p.playerId === obj.playerId && p.matchId === obj.matchId);
              if (idx >= 0) {
                collection[idx] = { ...collection[idx], ...obj };
                save();
                return { changes: 1 };
              }
            }
            // For news articles: replace by id
            if (lower.includes('newsarticle')) {
              const idx = collection.findIndex((a: any) => a.id === obj.id);
              if (idx >= 0) {
                collection[idx] = obj;
                save();
                return { changes: 1 };
              }
            }
          }
          
          // Handle INSERT OR IGNORE
          if (lower.includes('or ignore')) {
            if (obj.id) {
              const exists = collection.find((item: any) => item.id === obj.id);
              if (exists) return { changes: 0 };
            }
          }
          
          collection.push(obj);
          save();
          return { changes: 1 };
        }
        
        // UPDATE
        if (lower.startsWith('update')) {
          const collection = getCollection(sql);
          
          // Parse SET clause and WHERE clause
          const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
          const whereMatch = sql.match(/WHERE\s+(.+)$/i);
          
          if (!setMatch) return { changes: 0 };
          
          // Parse SET assignments - they use ? placeholders
          const setParts = setMatch[1].split(',').map(s => s.trim());
          const setFields: { field: string; paramIndex: number }[] = [];
          let paramIdx = 0;
          
          for (const part of setParts) {
            const [field] = part.split('=').map(s => s.trim());
            setFields.push({ field, paramIndex: paramIdx++ });
          }
          
          // Parse WHERE - remaining params are for WHERE clause
          let changes = 0;
          const whereParamStart = setFields.length;
          
          for (const item of collection) {
            // Simple WHERE matching for common patterns
            let match = true;
            if (whereMatch) {
              const whereStr = whereMatch[1];
              const whereParts = whereStr.split(/\s+AND\s+/i);
              let wpIdx = whereParamStart;
              for (const wp of whereParts) {
                const [field] = wp.split(/\s*=\s*/);
                const cleanField = field.trim();
                if (wp.includes('?')) {
                  if (item[cleanField] !== params[wpIdx]) match = false;
                  wpIdx++;
                }
              }
            }
            
            if (match) {
              for (const sf of setFields) {
                item[sf.field] = params[sf.paramIndex];
              }
              changes++;
            }
          }
          
          if (changes > 0) save();
          return { changes };
        }
        
        // DELETE
        if (lower.startsWith('delete')) {
          const collection = getCollection(sql);
          const whereMatch = sql.match(/WHERE\s+(.+)$/i);
          
          if (!whereMatch) return { changes: 0 };
          
          const initialLength = collection.length;
          const whereStr = whereMatch[1];
          const conditions = whereStr.split(/\s+AND\s+/i);
          
          let paramIdx = 0;
          const filters: { field: string; value: any }[] = [];
          for (const cond of conditions) {
            const [field] = cond.split(/\s*=\s*/);
            if (cond.includes('?')) {
              filters.push({ field: field.trim(), value: params[paramIdx++] });
            }
          }
          
          // Remove matching items
          const collName = lower.includes('from feedevent') || lower.includes('feedevent') ? 'feedEvents' :
                          lower.includes('from favorite') || lower.includes('favorite') ? 'favorites' :
                          lower.includes('from notification') || lower.includes('notification') ? 'notifications' : '';
          
          if (collName) {
            (state as any)[collName] = collection.filter((item: any) => {
              return !filters.every(f => item[f.field] === f.value);
            });
          }
          
          const changes = initialLength - getCollection(sql).length;
          if (changes > 0) save();
          return { changes };
        }
        
        return { changes: 0 };
      },
      
      get(...params: any[]) {
        const collection = getCollection(sql);
        const lower = sql.toLowerCase();
        
        // Handle COUNT
        if (lower.includes('count(')) {
          const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+GROUP|\s+ORDER|\s+LIMIT|$)/i);
          let filtered = collection;
          
          if (whereMatch && params.length > 0) {
            filtered = collection.filter((item: any) => {
              return simpleWhereFilter(item, whereMatch[1], params);
            });
          }
          
          return { cnt: filtered.length };
        }
        
        // Handle MAX
        if (lower.includes('max(')) {
          const fieldMatch = lower.match(/max\((\w+)\)\s+as\s+(\w+)/i);
          if (fieldMatch) {
            const field = fieldMatch[1];
            const alias = fieldMatch[2];
            let maxVal: string | null = null;
            for (const item of collection) {
              if (item[field] && (!maxVal || item[field] > maxVal)) {
                maxVal = item[field];
              }
            }
            return { [alias]: maxVal };
          }
        }
        
        // Regular SELECT with WHERE
        const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i);
        
        if (whereMatch && params.length > 0) {
          for (const item of collection) {
            if (simpleWhereFilter(item, whereMatch[1], params)) {
              return item;
            }
          }
          return undefined;
        }
        
        // No WHERE - return first
        return collection[0] || undefined;
      },
      
      all(...params: any[]) {
        const collection = getCollection(sql);
        const lower = sql.toLowerCase();
        
        let results = [...collection];
        
        // Apply WHERE filter
        const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+GROUP|\s+ORDER|\s+LIMIT|$)/i);
        if (whereMatch) {
          if (params.length > 0) {
            results = collection.filter((item: any) => {
              return simpleWhereFilter(item, whereMatch[1], params);
            });
          } else {
            // WHERE with no params means literal conditions only
            results = collection.filter((item: any) => {
              return simpleWhereFilter(item, whereMatch[1], []);
            });
          }
        }
        
        // Apply ORDER BY
        const orderMatch = sql.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|$)/i);
        if (orderMatch) {
          const orderStr = orderMatch[1].trim();
          const isDesc = orderStr.toLowerCase().includes('desc');
          const fieldMatch = orderStr.match(/(\w+)/);
          if (fieldMatch) {
            const field = fieldMatch[1];
            results.sort((a: any, b: any) => {
              const aVal = a[field] ?? '';
              const bVal = b[field] ?? '';
              if (aVal < bVal) return isDesc ? 1 : -1;
              if (aVal > bVal) return isDesc ? -1 : 1;
              return 0;
            });
          }
        }
        
        // Apply LIMIT
        const limitMatch = sql.match(/LIMIT\s+(\d+|\?)/i);
        if (limitMatch) {
          const limitVal = limitMatch[1] === '?' ? params[params.length - 1] : parseInt(limitMatch[1]);
          results = results.slice(0, limitVal);
        }
        
        return results;
      },
    };
  },
  
  exec(sql: string) {
    // No-op for CREATE TABLE etc - we don't need schema in JSON mode
  },
  
  transaction(fn: Function) {
    return (...args: any[]) => {
      fn(...args);
      save();
    };
  },
  
  pragma(_p: string) {
    // No-op
  },
  
  run(sql: string, params?: any[]) {
    db.prepare(sql).run(...(params || []));
  },
  
  getRowsModified() {
    return 0;
  },
};

// ─── Helper Functions ───────────────────────────────────────────────────────

function simpleWhereFilter(item: any, whereStr: string, params: any[]): boolean {
  // Split by AND (simple cases)
  const conditions = whereStr.split(/\s+AND\s+/i);
  let paramIdx = 0;
  
  for (const cond of conditions) {
    const trimmed = cond.trim();
    
    // Handle IN clause: field IN ('val1', 'val2')
    const inMatch = trimmed.match(/(\w+)\s+IN\s*\(([^)]+)\)/i);
    if (inMatch) {
      const field = inMatch[1];
      const values = inMatch[2].split(',').map(v => v.trim().replace(/'/g, ''));
      if (!values.includes(String(item[field]))) return false;
      continue;
    }
    
    // Handle = with ?
    if (trimmed.includes('?')) {
      const eqMatch = trimmed.match(/(\w+(?:\.\w+)?)\s*([!=<>]+)\s*\?/);
      if (eqMatch) {
        const field = eqMatch[1].includes('.') ? eqMatch[1].split('.').pop()! : eqMatch[1];
        const op = eqMatch[2];
        const value = params[paramIdx++];
        
        if (op === '=' && item[field] !== value) return false;
        if (op === '!=' && item[field] === value) return false;
        if (op === '>=' && item[field] < value) return false;
        if (op === '<=' && item[field] > value) return false;
      } else {
        paramIdx++;
      }
      continue;
    }
    
    // Handle = with literal string
    const literalMatch = trimmed.match(/(\w+)\s*=\s*'([^']+)'/);
    if (literalMatch) {
      const field = literalMatch[1];
      const value = literalMatch[2];
      if (item[field] !== value) return false;
      continue;
    }
    
    // Handle != with literal
    const neqMatch = trimmed.match(/(\w+)\s*!=\s*'([^']+)'/);
    if (neqMatch) {
      const field = neqMatch[1];
      const value = neqMatch[2];
      if (item[field] === value) return false;
      continue;
    }
  }
  
  return true;
}

export function initializeDatabase(): void {
  // No-op - JSON doesn't need schema initialization
  save();
}

export { save as saveDb };
export default db;
