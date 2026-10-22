import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./e2e', timeout:60000, workers:1,
 use:{baseURL:'http://127.0.0.1:5180',channel:'msedge',headless:true,trace:'retain-on-failure'},
 projects:[{name:'desktop-1366',use:{viewport:{width:1366,height:768}}},{name:'desktop-1920',use:{viewport:{width:1920,height:1080}}}],
 webServer:{command:'npm.cmd run dev -- --port 5180 --strictPort',url:'http://127.0.0.1:5180',reuseExistingServer:false},
});
