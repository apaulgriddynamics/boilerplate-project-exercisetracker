const DatabaseManager = require("./database");

class ExerciseTrackerService {
  constructor(dbPath = null) {
    this.db = new DatabaseManager(dbPath);
  }

  validateUsername(username) {
    if (typeof username !== "string") {
      throw new Error("Username is required and must be a string");
    }

    const trimmed = username.trim();
    if (trimmed.length === 0) {
      throw new Error("Username cannot be empty");
    }

    if (trimmed.length > 100) {
      throw new Error("Username cannot exceed 100 characters");
    }

    return trimmed;
  }

  validateExerciseData(description, duration, date) {
    const errors = [];

    if (
      !description ||
      typeof description !== "string" ||
      description.trim().length === 0
    ) {
      errors.push("Description is required and cannot be empty");
    } else if (description.trim().length > 500) {
      errors.push("Description cannot exceed 500 characters");
    }

    const durationNum = parseInt(duration);
    if (!duration || isNaN(durationNum) || durationNum <= 0) {
      errors.push("Duration is required and must be a positive integer");
    }

    let validDate = null;
    if (date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        errors.push("Date must be in YYYY-MM-DD format");
      } else {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
          errors.push("Invalid date provided");
        } else {
          validDate = date;
        }
      }
    } else {
      validDate = new Date().toISOString().split("T")[0];
    }

    if (errors.length > 0) {
      throw new Error(errors.join(", "));
    }

    return {
      description: description.trim(),
      duration: durationNum,
      date: validDate,
    };
  }

  validateUserId(userId) {
    const id = parseInt(userId);
    if (isNaN(id) || id <= 0) {
      throw new Error("Invalid user ID");
    }
    return id;
  }

  validateQueryParams(from, to, limit) {
    const errors = [];
    let validFrom = null;
    let validTo = null;
    let validLimit = null;

    if (from) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(from)) {
        errors.push("from date must be in YYYY-MM-DD format");
      } else {
        const parsedDate = new Date(from);
        if (isNaN(parsedDate.getTime())) {
          errors.push("Invalid from date provided");
        } else {
          validFrom = from;
        }
      }
    }

    if (to) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(to)) {
        errors.push("to date must be in YYYY-MM-DD format");
      } else {
        const parsedDate = new Date(to);
        if (isNaN(parsedDate.getTime())) {
          errors.push("Invalid to date provided");
        } else {
          validTo = to;
        }
      }
    }

    if (limit) {
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum <= 0) {
        errors.push("limit must be a positive integer");
      } else {
        validLimit = limitNum;
      }
    }

    if (validFrom && validTo && validFrom > validTo) {
      errors.push("from date cannot be after to date");
    }

    if (errors.length > 0) {
      throw new Error(errors.join(", "));
    }

    return { from: validFrom, to: validTo, limit: validLimit };
  }

  async createUser(username) {
    try {
      const validUsername = this.validateUsername(username);
      const user = this.db.createUser(validUsername);
      return user;
    } catch (error) {
      throw error;
    }
  }

  async getAllUsers() {
    try {
      return this.db.getAllUsers();
    } catch (error) {
      throw new Error("Failed to retrieve users");
    }
  }

  async createExercise(userId, description, duration, date) {
    try {
      const validUserId = this.validateUserId(userId);

      const user = this.db.getUserById(validUserId);
      if (!user) {
        throw new Error("User not found");
      }

      const {
        description: validDescription,
        duration: validDuration,
        date: validDate,
      } = this.validateExerciseData(description, duration, date);

      const exercise = this.db.createExercise(
        validUserId,
        validDescription,
        validDuration,
        validDate
      );

      return {
        userId: validUserId,
        exerciseId: exercise.id,
        duration: exercise.duration,
        description: exercise.description,
        date: exercise.date,
      };
    } catch (error) {
      throw error;
    }
  }

  async getUserExerciseLogs(userId, from, to, limit) {
    try {
      const validUserId = this.validateUserId(userId);

      const user = this.db.getUserById(validUserId);
      if (!user) {
        throw new Error("User not found");
      }

      const {
        from: validFrom,
        to: validTo,
        limit: validLimit,
      } = this.validateQueryParams(from, to, limit);

      const logs = this.db.getUserExerciseLogs(
        validUserId,
        validFrom,
        validTo,
        validLimit
      );
      const count = this.db.getUserExerciseCount(
        validUserId,
        validFrom,
        validTo
      );

      return {
        id: user.id,
        username: user.username,
        logs: logs,
        count: count,
      };
    } catch (error) {
      throw error;
    }
  }

  close() {
    this.db.close();
  }
}

module.exports = ExerciseTrackerService;
