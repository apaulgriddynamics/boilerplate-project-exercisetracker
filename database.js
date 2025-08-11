const Database = require("better-sqlite3");
const path = require("path");

class DatabaseManager {
  constructor(dbPath = null) {
    const dbFile = dbPath || path.join(__dirname, "exercise_tracker.db");
    this.db = new Database(dbFile);
    this.init();
  }

  init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        duration INTEGER NOT NULL,
        date TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id);
      CREATE INDEX IF NOT EXISTS idx_exercises_date ON exercises(date);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);
  }

  createUser(username) {
    try {
      const stmt = this.db.prepare("INSERT INTO users (username) VALUES (?)");
      const result = stmt.run(username);
      return this.getUserById(result.lastInsertRowid);
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new Error("Username already exists");
      }
      throw error;
    }
  }

  getUserById(id) {
    const stmt = this.db.prepare("SELECT id, username FROM users WHERE id = ?");
    return stmt.get(id);
  }

  getUserByUsername(username) {
    const stmt = this.db.prepare(
      "SELECT id, username FROM users WHERE username = ?"
    );
    return stmt.get(username);
  }

  getAllUsers() {
    const stmt = this.db.prepare("SELECT id, username FROM users ORDER BY id");
    return stmt.all();
  }

  createExercise(userId, description, duration, date) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO exercises (user_id, description, duration, date) 
        VALUES (?, ?, ?, ?)
      `);
      const result = stmt.run(userId, description, duration, date);
      return this.getExerciseById(result.lastInsertRowid);
    } catch (error) {
      throw error;
    }
  }

  getExerciseById(id) {
    const stmt = this.db.prepare(`
      SELECT id, user_id as userId, description, duration, date 
      FROM exercises 
      WHERE id = ?
    `);
    return stmt.get(id);
  }

  getUserExerciseLogs(userId, from = null, to = null, limit = null) {
    let query = `
      SELECT e.id, e.description, e.duration, e.date 
      FROM exercises e 
      WHERE e.user_id = ?
    `;
    const params = [userId];

    if (from) {
      query += " AND e.date >= ?";
      params.push(from);
    }
    if (to) {
      query += " AND e.date <= ?";
      params.push(to);
    }

    query += " ORDER BY e.date ASC";

    if (limit && limit > 0) {
      query += " LIMIT ?";
      params.push(limit);
    }

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  getUserExerciseCount(userId, from = null, to = null) {
    let query = "SELECT COUNT(*) as count FROM exercises WHERE user_id = ?";
    const params = [userId];

    if (from) {
      query += " AND date >= ?";
      params.push(from);
    }
    if (to) {
      query += " AND date <= ?";
      params.push(to);
    }

    const stmt = this.db.prepare(query);
    const result = stmt.get(...params);
    return result.count;
  }

  close() {
    this.db.close();
  }
}

module.exports = DatabaseManager;
