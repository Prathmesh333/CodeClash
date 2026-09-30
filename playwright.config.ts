import { defineConfig } from '@playwright/test';
const port = Number(process.env.E2E_PORT ?? 8790);
export default defineConfig({testDir:'tests/e2e',fullyParallel:false,workers:1,timeout:120000,use:{baseURL:`http://127.0.0.1:${port}`,channel:process.env.CI?undefined:'chrome',trace:'retain-on-failure',screenshot:'only-on-failure'},reporter:[['list'],['html',{open:'never'}]],webServer:{command:'node scripts/test-server.mjs',url:`http://127.0.0.1:${port}/api/health`,reuseExistingServer:false,timeout:180000}});
