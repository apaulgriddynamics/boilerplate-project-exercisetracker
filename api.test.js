const request = require("supertest");

process.env.NODE_ENV = "test";

const { exerciseService } = require("./index");
const app = require("./index");

describe("Exercise Tracker API", () => {
  let testUserId;

  afterAll(async () => {
    if (exerciseService) {
      exerciseService.close();
    }
  });

  describe("POST /api/users", () => {
    test("should create a new user", async () => {
      const response = await request(app)
        .post("/api/users")
        .send({ username: "testuser" })
        .expect(200);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("username", "testuser");
      testUserId = response.body.id;
    });

    test("should reject empty username", async () => {
      const response = await request(app)
        .post("/api/users")
        .send({ username: "" })
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("cannot be empty");
    });

    test("should reject missing username", async () => {
      const response = await request(app)
        .post("/api/users")
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("required");
    });

    test("should reject duplicate username", async () => {
      await request(app)
        .post("/api/users")
        .send({ username: "duplicate" })
        .expect(200);

      const response = await request(app)
        .post("/api/users")
        .send({ username: "duplicate" })
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("already exists");
    });
  });

  describe("GET /api/users", () => {
    test("should get all users", async () => {
      const response = await request(app).get("/api/users").expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty("id");
      expect(response.body[0]).toHaveProperty("username");
    });
  });

  describe("POST /api/users/:_id/exercises", () => {
    test("should create an exercise", async () => {
      const response = await request(app)
        .post(`/api/users/${testUserId}/exercises`)
        .send({
          description: "Running",
          duration: 30,
          date: "2024-01-01",
        })
        .expect(200);

      expect(response.body).toHaveProperty("userId", testUserId);
      expect(response.body).toHaveProperty("exerciseId");
      expect(response.body).toHaveProperty("description", "Running");
      expect(response.body).toHaveProperty("duration", 30);
      expect(response.body).toHaveProperty("date", "2024-01-01");
    });

    test("should create exercise with current date when no date provided", async () => {
      const today = new Date().toISOString().split("T")[0];

      const response = await request(app)
        .post(`/api/users/${testUserId}/exercises`)
        .send({
          description: "Swimming",
          duration: 45,
        })
        .expect(200);

      expect(response.body).toHaveProperty("date", today);
    });

    test("should reject invalid user ID", async () => {
      const response = await request(app)
        .post("/api/users/999/exercises")
        .send({
          description: "Running",
          duration: 30,
        })
        .expect(404);

      expect(response.body).toHaveProperty("error", "User not found");
    });

    test("should reject missing description", async () => {
      const response = await request(app)
        .post(`/api/users/${testUserId}/exercises`)
        .send({
          duration: 30,
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Description is required");
    });

    test("should reject invalid duration", async () => {
      const response = await request(app)
        .post(`/api/users/${testUserId}/exercises`)
        .send({
          description: "Running",
          duration: "invalid",
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Duration");
    });

    test("should reject invalid date format", async () => {
      const response = await request(app)
        .post(`/api/users/${testUserId}/exercises`)
        .send({
          description: "Running",
          duration: 30,
          date: "invalid-date",
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("YYYY-MM-DD");
    });
  });

  describe("GET /api/users/:_id/logs", () => {
    beforeAll(async () => {
      await request(app).post(`/api/users/${testUserId}/exercises`).send({
        description: "Cycling",
        duration: 60,
        date: "2024-01-02",
      });

      await request(app).post(`/api/users/${testUserId}/exercises`).send({
        description: "Weightlifting",
        duration: 45,
        date: "2024-01-03",
      });
    });

    test("should get user exercise logs", async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}/logs`)
        .expect(200);

      expect(response.body).toHaveProperty("id", testUserId);
      expect(response.body).toHaveProperty("username");
      expect(response.body).toHaveProperty("logs");
      expect(response.body).toHaveProperty("count");
      expect(Array.isArray(response.body.logs)).toBe(true);
      expect(response.body.logs.length).toBeGreaterThan(0);
      expect(response.body.count).toBeGreaterThan(0);
    });

    test("should filter logs by date range", async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}/logs?from=2024-01-02&to=2024-01-03`)
        .expect(200);

      expect(response.body.logs.length).toBe(2);
      expect(response.body.count).toBe(2);
    });

    test("should limit number of logs returned", async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}/logs?limit=1`)
        .expect(200);

      expect(response.body.logs.length).toBe(1);
      expect(response.body.count).toBeGreaterThan(1);
    });

    test("should reject invalid user ID", async () => {
      const response = await request(app)
        .get("/api/users/999/logs")
        .expect(404);

      expect(response.body).toHaveProperty("error", "User not found");
    });

    test("should reject invalid date format in query", async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}/logs?from=invalid-date`)
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("YYYY-MM-DD");
    });

    test("should reject invalid limit", async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}/logs?limit=-1`)
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("positive integer");
    });
  });

  describe("Error handling", () => {
    test("should return 404 for undefined routes", async () => {
      const response = await request(app).get("/api/nonexistent").expect(404);

      expect(response.body).toHaveProperty("error", "Route not found");
    });
  });
});
