import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/variables.css'
import { setAuthRouter } from './stores/auth'

// 注册路由实例给 auth store，用于 401 时自动跳转登录页
setAuthRouter(router)

createApp(App).use(router).mount('#app')
