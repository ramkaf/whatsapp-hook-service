<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

WhatsApp webhook service built with NestJS and TypeScript (ES modules).

Use `.ts` extensions for relative source imports, for example
`import { AppModule } from './app.module.ts'`. TypeScript rewrites these to `.js`
in the compiled output via `rewriteRelativeImportExtensions`, so the build runs
with Node's native ES modules.

Import shared utilities through `import { BaseLogUtil } from '#common'`.
The `paths` mapping in `tsconfig.json` resolves `#common` to
`src/libs/common/index.ts` for TypeScript and tests. The matching `imports`
entry in `package.json` resolves it to `dist/libs/common/index.js` at runtime.
This is a local alias; `src/libs/common` remains a regular source folder.

## Project map

- `src/main.ts`: creates the Nest application and listens on the configured port.
- `src/app.module.ts`: imports the WhatsApp module.
- `src/whatsapp/whatsapp.module.ts`: registers the controller, providers, and API guard.
- `src/whatsapp/controllers/`: HTTP endpoints and their tests.
- `src/whatsapp/providers/`: Baileys connection, group monitoring, message handler, and provider tests.
- `src/whatsapp/guards/`: bearer token validation and its tests.
- `src/libs/common/docs/`: reusable controller/endpoint docs decorators, shared error DTO, and Swagger setup.
- `src/whatsapp/dto/`: Swagger request and response schemas.
- `src/libs/common/config/`: shared configuration factories.
- `src/libs/common/providers/`: shared logging services, exported through `#common`.
- `vitest.config.ts` and `vitest.config.e2e.ts`: unit and end-to-end test configuration.
- `docker-compose.yml`: currently empty; container deployment is not configured.

## Environment configuration

Three stages are supported: `development` (default), `staging`, and `production`.
Select the stage with the shell variable `NODE_ENV` before starting the app;
do not use an env file to select a stage. Unknown stages fail at startup.

Copy the example files for the stages you use:

```bash
cp .env.example .env
cp .env.staging.example .env.staging
cp .env.production.example .env.production
```

Configuration priority, from highest to lowest:

1. Runtime environment variables (for example, deployment secrets).
2. `.env.<stage>.local`.
3. `.env.<stage>`.
4. `.env` shared defaults.

All actual env files are ignored by Git; only the examples are committed.
Env files are optional when configuration is supplied by the runtime environment.
Run commands from the project root so the files can be found.

| Variable   | Default         | Validation                                |
| ---------- | --------------- | ----------------------------------------- |
| `NODE_ENV` | `development`   | `development`, `staging`, or `production` |
| `PORT`     | None (required) | Integer from 1 to 65535                   |

`.example` files are templates and are not loaded at runtime; copy them to the
matching `.env.<stage>` file. The templates use development port `4000`, staging
port `5000`, and production port `3000`. Supply `PORT` through an env file or the
runtime environment; missing ports fail startup validation. A shared `.env`
containing `PORT=3000` applies to every stage unless a higher-priority value exists.

Configuration code is separated into `enums/` (the `Environment` enum),
`interfaces/` (TypeScript types), `validation/` (Joi schemas), and `utils/`
(stage selection, file paths, and validation). Joi validates startup settings,
converts numeric port strings, and reports all validation errors together.

```bash
npm run start:dev
npm run build
npm run start:staging
npm run start:prod
# Override a stage's port:
PORT=8080 npm run start:prod
```

The stage scripts use POSIX shell environment assignments (Linux/macOS).
`start:staging` and `start:prod` run the compiled build; rebuild after source changes.
Other modules can inject the globally available `ConfigService` from `@nestjs/config`.
Use `ConfigService<EnvironmentVariables, true>` and `config.getOrThrow('PORT', { infer: true })`
for typed access to validated settings (see `src/main.ts`).

The module is `src/config/app-config.module.ts`. Environment types are in
`src/config/interfaces/env.interface.ts`, the enum in `src/config/enums/env.enum.ts`,
Joi schemas in `src/config/validation/env.validation.ts`, and stage/file utilities
in `src/config/utils/env.utils.ts`. The enum supplies the allowed stages to Joi,
so stage names have one source of truth. Validation checks the merged configuration
from the selected files and runtime variables; other stages' files are not loaded.

## Project setup

Use Node.js 26.12.1 (pinned in `.nvmrc`). With nvm:

```bash
nvm install
nvm use
```

The dependency tree requires Node.js `^22.22.3 || ^24.15.0 || >=26.0.0`.
Node.js 18 cannot parse the `/v` regular expressions used by the CLI dependencies.
The engine check in `.npmrc` rejects unsupported Node versions during installation.
Run `nvm use` in each new terminal before running project commands.

```bash
pnpm install
pnpm start:dev
```

## Swagger API documentation

Start the server with `pnpm start:dev`, then open `http://localhost:3000/docs`
(use your configured `APP_PORT` if different). The OpenAPI JSON is available at
`/docs-json` for import into Postman or client generation.

Click **Authorize**, paste the value of `WHATSAPP_API_TOKEN` without the `Bearer`
prefix, then use **Try it out** on the WhatsApp endpoints. Swagger does not
prepopulate your token or persist it across page reloads.

The docs cover connection, status, QR JSON/PNG, joined groups, and group message
sending, including request examples and error responses. Pairing starts only when you execute the
connect request; sending a message requires executing the messages request.

Controllers define their own titles, descriptions, and schemas using shared
decorators from `#common`. The implementation lives in
`src/libs/common/docs/api-docs.decorators.ts` and has no WhatsApp-specific imports:

```ts
@ApiControllerDocs({ tag: 'WhatsApp', bearerAuth: 'whatsapp-token' })
@Controller('whatsapp')
export class WhatsappController {
  @Get('status')
  @ApiEndpointDocs({
    summary: 'Get connection status',
    description: 'Check whether the linked account is connected.',
    responses: [{ status: 200, type: WhatsappStatusDto }],
  })
  status() {
    return this.whatsapp.getStatus();
  }
}
```

`ApiControllerDocs` supports shared response definitions; `ApiEndpointDocs`
supports an optional request `body` and Swagger response options, including
JSON DTOs, arrays, and binary content. These helpers document authentication;
the controller's `@UseGuards` decorator continues to enforce it.

## Send a message to an existing WhatsApp group (Baileys)

`src/whatsapp/` links your WhatsApp Business phone app as a companion device.
It uses Baileys `7.0.0-rc14` (ES modules); it does not use the Meta Cloud API
or the `/whatsapp-webhook` endpoints.

1. Add the settings from `.env.whatsapp.example` to your existing `.env`.
   Generate `WHATSAPP_API_TOKEN` with
   `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
   Keep the token private. The new endpoints require `Authorization: Bearer <token>`;
   they return 503 until the token is configured.
2. Run `nvm use` and `pnpm start:dev` from the project root.
3. In a second terminal, set the same token and the app URL (the current app
   uses `APP_PORT`, default `3000`):

   ```bash
   export WHATSAPP_API_TOKEN='your-private-token-from-env'
   export WHATSAPP_URL='http://localhost:3000'
   curl -X POST "$WHATSAPP_URL/whatsapp/connect" \
     -H "Authorization: Bearer $WHATSAPP_API_TOKEN"
   ```

4. Scan the QR printed in the server terminal using **WhatsApp Business →
   Settings → Linked devices → Link a device** on the account that already
   belongs to the group. QR codes refresh while pairing; use the newest one.
   You can also get the QR through the API (same bearer token required):

   - `GET /whatsapp/qr` returns JSON with `qr` (raw pairing text) and
     `qrDataUrl` (PNG data URL suitable for an HTML image's `src`).
   - `GET /whatsapp/qr/image` returns an inline PNG; in Postman, use the image
     preview. It returns 404 while no QR is available.

   `POST /whatsapp/connect` also returns the QR fields when already available.
   The first response may have `qrDataUrl: null` because WhatsApp has not emitted
   a QR yet. Poll `/whatsapp/qr` every two seconds while connecting or awaiting
   pairing; stop after `status: connected`. Fetch again if a QR rotates or expires.
   QR data is kept only in memory, cleared on connection or disconnect, and
   returned with `Cache-Control: no-store`.

   If `hasSavedSession` is true, Baileys is restoring a previous linked-device
   login rather than generating a new QR. Wait for `status: connected` using
   `/whatsapp/status`. A non-null `accountJid` alone does not mean the connection
   is ready. `qrUnavailableReason` explains why the QR is missing; the PNG
   endpoint includes the same status information in its 404 response. If it
   keeps reconnecting, inspect `lastDisconnectCode` and the server logs.
   For a deliberately fresh pairing, stop the server, set `WHATSAPP_AUTH_DIR`
   to a new empty directory inside `.data/`, restart, and connect again. This
   preserves the old credentials; it does not unlink the old device on the phone.

5. Check the status, then list the account's existing groups:

   ```bash
   curl "$WHATSAPP_URL/whatsapp/status" \
     -H "Authorization: Bearer $WHATSAPP_API_TOKEN"
   # Wait for status: connected.
   curl "$WHATSAPP_URL/whatsapp/groups" \
     -H "Authorization: Bearer $WHATSAPP_API_TOKEN"
   ```

6. Copy the chosen group's `id` (ending in `@g.us`) and send a message:

   ```bash
   curl -X POST "$WHATSAPP_URL/whatsapp/messages" \
     -H "Authorization: Bearer $WHATSAPP_API_TOKEN" \
     -H 'Content-Type: application/json' \
     -d '{"groupJid":"120363000000000000@g.us","text":"Hello from our WhatsApp service"}'
   ```

The response contains `groupJid`, `messageId`, and `status: "sent"`. This means
Baileys completed the send call, not that every member received or read it.
Only groups the linked account belongs to are allowed. WhatsApp still enforces
group restrictions, including admin-only posting. Sends are not automatically
retried; check the group before retrying an uncertain result.

Credentials are saved in `.data/whatsapp-auth` (ignored by Git). Keep this
directory private and persistent; it contains account access credentials. Use
one app process per session. After restarting the server, call `/whatsapp/connect`
again; saved credentials normally avoid another QR scan. Temporary disconnects
reconnect automatically. Shutdown closes the connection without logging out.
If the status is `logged_out`, stop the server, remove only that session's auth
directory, restart, and connect/scan again. A custom `WHATSAPP_AUTH_DIR` should
also be excluded from version control.

This first implementation uses Baileys' file-based auth helper for local use.
Use a database-backed auth store before running multiple instances or deploying
this as a production service. No message is sent during startup or pairing.

## Monitor incoming group messages

After `/whatsapp/connect` pairs the account, incoming messages from **all joined
groups** run `GroupMessageHandler.handle(context)` in
`src/whatsapp/providers/group-message.handler.ts`. Inject your application services there
and call their functions with the context. For asynchronous work, make `handle`
an `async` method and await your functions.

The typed context (`src/whatsapp/group-message.context.ts`) contains:

- `text` (text or media caption), `type`, `messageId`, `sentAt`, and `receivedAt`.
- `sender`: WhatsApp JID, alternate JID, phone number when available, display
  name, available contact data, and group participant data (including admin role).
- `group`: full group metadata when retrievable, including name and participants.
- `content`: normalized message content, including media metadata.
- `raw`: the original Baileys message, preserving mentions, replies, and other fields.

Example customization inside `GroupMessageHandler`:

```ts
async handle(context: GroupMessageContext): Promise<void> {
  await this.yourService.process(context);
}
```

The default example logs the message type and ID; it does not print message
content or sender contact details. Profile/contact information depends on what
WhatsApp supplies: names, phone numbers and group metadata can be unavailable.
An `@lid` identity is never treated as a phone number. Media bytes are not
automatically downloaded; media details remain in `content` and `raw`.

`WHATSAPP_MONITORED_GROUP_JIDS` defaults to `*` (all joined groups). Optionally
set it in `.env` to comma-separated group IDs from `/whatsapp/groups` to restrict
monitoring, or set it to an empty value to disable monitoring. Restart after
changing `.env`.

Only `notify` events trigger the handler. History replay, outgoing messages,
direct chats, and protocol-only events are skipped. Up to 10,000 recent message
identities are deduplicated in memory across socket reconnects. Handler failures
are logged without blocking later messages; they are not automatically retried.
This is not a durable job queue: app restarts clear deduplication, and handlers
should use persisted message IDs for business operations requiring idempotency.

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

To add it to this project, run this and approve the code it prints at [observe.nestjs.com/link](https://observe.nestjs.com/link) - signing up for free if you have no account:

```bash
$ npx @nestjs/observe link
```

It installs `@nestjs/observe`, wires it into `AppModule` and `main.ts`, and writes the app key and secret into `.env`, which every `nest start` script (`start`, `start:dev`, `start:debug`) then loads. In production, set `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` in the environment instead.

Or do it by hand:

```bash
$ npm install @nestjs/observe
```

Then follow the [setup guide](https://docs.nestjs.com/observability/sdk) - it takes a single import and an app key.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
