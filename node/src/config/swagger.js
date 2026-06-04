import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

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
      },
    },

    security: [
      {
        bearerAuth: [],
      },
    ],
  },

  apis: [
    "./src/auth/*.js",
    "./src/posts/*.js",
    "./src/providerProfile/*.js",
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app) {
  app.use(
    "/api-docs",

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