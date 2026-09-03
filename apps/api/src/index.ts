import { build } from './server.ts';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

const app = build();

app.listen({ port, host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
