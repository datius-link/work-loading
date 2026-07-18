import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, "..");
const swaggerGlob = (...parts) => path.join(...parts).replace(/\\/g, "/");
const isProduction = process.env.NODE_ENV === "production";

const options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "e-kazi API",
      version: "1.0.0",
      description: "e-kazi backend API documentation",

      contact: {
        name: "e-kazi",
        email: "support@ekazi.app",
      },

      license: {
        name: "MIT",
      },
    },

    servers: [
      {
        url: "http://localhost:5000",
        description: "Local server",
      },
    ],

    tags: [
      {
        name: "Auth",
        description: "Provider authentication",
      },

      {
        name: "Viewer",
        description: "Viewer authentication",
      },

      {
        name: "Password",
        description: "Password reset",
      },

      {
        name: "Provider",
        description: "Provider profile endpoints",
      },

      {
        name: "Posts",
        description: "Posts endpoints",
      },
      {
        name: "Profiles",
        description: "Shared user and service provider profiles",
      },
      {
        name: "Hiring",
        description: "Jobs, direct hires, and applications",
      },
      {
        name: "Notifications",
        description: "Notification inbox endpoints",
      },
      {
        name: "Support",
        description: "Authenticated contact, feedback, and problem reports",
      },
      {
        name: "Search",
        description: "Full-text search across people, posts, skills, and hashtags",
      },
      {
        name: "Recommendations",
        description: "Job ratings and recommendations for providers",
      },
      {
        name: "Calls",
        description: "Push notification trigger for in-app WebRTC calling",
      },
      {
        name: "Admin",
        description: "Admin web panel authentication and support inbox",
      },
      {
        name: "System",
        description: "Health check",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },

      schemas: {
        AuthPayload: {
          type: "object",

          properties: {
            email: {
              type: "string",
              example: "provider@gmail.com",
            },

            password: {
              type: "string",
              example: "123456",
            },
          },
        },

        VerifyPayload: {
          type: "object",

          properties: {
            verifyToken: {
              type: "string",
            },

            code: {
              type: "string",
              example: "123456",
            },
          },
        },

        PostMedia: {
          type: "object",

          properties: {
            url: {
              type: "string",
              example:
                "https://cdn.ekazi.app/post.jpg",
            },

            type: {
              type: "string",
              example: "image",
            },
          },
        },

        CreatePostPayload: {
          type: "object",

          properties: {
            caption: {
              type: "string",
              example:
                "New kitchen installation #fundi",
            },

            location: {
              type: "string",
              example: "Dar es Salaam",
            },

            type: {
              type: "string",
              example: "moment",
            },

            media: {
              type: "array",

              items: {
                $ref:
                  "#/components/schemas/PostMedia",
              },
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Request failed",
            },
          },
        },
        MediaItem: {
          type: "object",
          properties: {
            url: {
              type: "string",
              example: "https://cdn.ekazi.app/work.jpg",
            },
            type: {
              type: "string",
              example: "image",
            },
          },
        },
        Job: {
          type: "object",
          properties: {
            id: { type: "integer", example: 12 },
            uuid: { type: "string", example: "7bb6a6f1-9d64-44da-9a57-fd8777460201" },
            job_code: { type: "string", example: "EKZ-2026-0012" },
            title: { type: "string", example: "Fridge repair" },
            description: { type: "string", example: "Freezer is not cooling." },
            location: { type: "string", example: "Mbezi Beach, Dar es Salaam" },
            service_type: { type: "string", example: "Fridge Repair" },
            status: { type: "string", example: "open" },
            hire_type: { type: "string", example: "indirect" },
            tender_closes_at: { type: "string", nullable: true, example: "2026-06-22" },
          },
        },
        CreateJobPayload: {
          type: "object",
          required: ["title", "description", "location", "service_type"],
          properties: {
            title: { type: "string", example: "Fridge repair" },
            description: { type: "string", example: "Freezer is not cooling." },
            location: { type: "string", example: "Mbezi Beach, Dar es Salaam" },
            service_type: { type: "string", example: "Fridge Repair" },
            tender_closes_at: { type: "string", nullable: true, example: "2026-06-22" },
            media: {
              type: "array",
              items: { $ref: "#/components/schemas/MediaItem" },
            },
          },
        },
        DirectHirePayload: {
          type: "object",
          required: ["requested_provider_uuid", "title", "description"],
          properties: {
            requested_provider_uuid: { type: "string", example: "2c5e74bb-3cef-4f4b-92c1-95356cf92df0" },
            title: { type: "string", example: "Fix my sink" },
            description: { type: "string", example: "Kitchen sink is leaking." },
            location: { type: "string", example: "Direct hire" },
            service_type: { type: "string", example: "Plumbing" },
            scheduled_for: { type: "string", nullable: true, example: "2026-06-12 09:00" },
            availability_notes: { type: "string", nullable: true, example: "Morning is best." },
            media: {
              type: "array",
              items: { $ref: "#/components/schemas/MediaItem" },
            },
          },
        },
        ApplicationPayload: {
          type: "object",
          required: ["message"],
          properties: {
            message: { type: "string", example: "I can inspect and repair this today." },
            budget: { type: "string", example: "TZS 45,000" },
            duration: { type: "string", example: "2 hours" },
            availableFrom: { type: "string", example: "2026-06-12" },
            experience: { type: "string", example: "7 years" },
            notes: { type: "string", example: "I will bring replacement parts." },
            media: {
              type: "array",
              items: { $ref: "#/components/schemas/MediaItem" },
            },
          },
        },
        AssignProviderPayload: {
          type: "object",
          required: ["application_id"],
          properties: {
            application_id: { type: "integer", example: 34 },
            provider_uuid: { type: "string", example: "2c5e74bb-3cef-4f4b-92c1-95356cf92df0" },
          },
        },
      },
    },

    security: [
      {
        bearerAuth: [],
      },
    ],
    paths: {
      "/health": {
        get: {
          summary: "Health check",
          tags: ["System"],
          security: [],
          responses: {
            200: {
              description: "API is running",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "ok" },
                      service: { type: "string", example: "e-kazi-api" },
                      timestamp: { type: "string", example: "2026-06-08T09:00:00.000Z" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  apis: [
    swaggerGlob(srcDir, "auth", "*.js"),
    swaggerGlob(srcDir, "posts", "*.js"),
    swaggerGlob(srcDir, "providerProfile", "*.js"),
    swaggerGlob(srcDir, "profiles", "*.js"),
    swaggerGlob(srcDir, "hiring", "*.js"),
    swaggerGlob(srcDir, "notifications", "*.js"),
    swaggerGlob(srcDir, "support", "*.js"),
    swaggerGlob(srcDir, "search", "*.js"),
    swaggerGlob(srcDir, "recommendations", "*.js"),
    swaggerGlob(srcDir, "calls", "*.js"),
    swaggerGlob(srcDir, "admin", "*.js"),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

function swaggerAuth(req, res, next) {
  const username = process.env.SWAGGER_USERNAME;
  const password = process.env.SWAGGER_PASSWORD;

  if (!username || !password) {
    return res.status(404).json({ message: "Route not found" });
  }

  const auth = req.headers.authorization || "";
  const [scheme, encoded] = auth.split(" ");

  if (scheme === "Basic" && encoded) {
    const provided = Buffer.from(encoded, "base64").toString("utf8");

    if (provided === `${username}:${password}`) {
      return next();
    }
  }

  res.set("WWW-Authenticate", 'Basic realm="e-kazi API Docs"');
  return res.status(401).json({ message: "Authentication required" });
}

export function setupSwagger(app) {
  if (isProduction && (!process.env.SWAGGER_USERNAME || !process.env.SWAGGER_PASSWORD)) {
    return;
  }

  app.get("/api-docs.json", swaggerAuth, (_req, res) => {
    res.json(swaggerSpec);
  });

  app.use(
    "/api-docs",

    swaggerAuth,

    swaggerUi.serve,

    swaggerUi.setup(swaggerSpec, {
      explorer: true,

      swaggerOptions: {
        persistAuthorization: true,
      },

      customSiteTitle: "e-kazi API Docs",
    })
  );
}
