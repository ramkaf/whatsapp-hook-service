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
- `src/app.module.ts`: imports configuration and the WhatsApp webhook module.
- `src/config/`: global configuration, stage selection, and startup validation.
- `src/whatsapp-webhook-server/whatsapp-webhook-server.module.ts`: registers the webhook controller, providers, and repository.
- `src/whatsapp-webhook-server/controllers/whatsapp-webhook-server.controller.ts`: `GET /whatsapp-webhook` returns `OK`; `POST /whatsapp-webhook` acknowledges receipt.
- `src/whatsapp-webhook-server/providers/`: placeholder webhook, payload, signature, and event services. The event service is not registered yet.
- `src/whatsapp-webhook-server/repository/`: placeholder webhook repository.
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
