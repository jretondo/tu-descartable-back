export = {
  apps: [
    {
      name: 'P3004-tu-descartable-prod',
      script: 'dist/api/index.js',
      env: {
        PORT: 3004,
      },
    },
  ],
};
