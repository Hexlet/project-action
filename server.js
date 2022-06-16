// @ts-check

import Fastify from 'fastify';

const fastify = Fastify({ logger: true });

// Declare a route
fastify.get('/api/user_project_github_workflow/project_members/:id', async () => {
  const result = {
    tests_on: true,
    project: {
      image_name: 'hexlet-project-source-ci',
    },
  };

  return result;
});

// Run the server!
const start = async () => {
  try {
    await fastify.listen(3000);
    fastify.log.info(`server listening on ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
