process.env.RULES_DATABASE_URL ??= "file:./db/local/runtime-check-rules.sqlite";
process.env.CONTENT_DATABASE_URL ??= "file:./db/local/runtime-check-content.sqlite";
process.env.APP_STATE_DATABASE_URL ??= "file:./db/local/runtime-check-app-state.sqlite";

require("../dist/src/app.js");

console.log("server runtime import ok");
