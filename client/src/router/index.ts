import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: "/",
			name: "home",
			component: () => import("../pages/HomePage.vue"),
		},
		{
			path: "/welcome",
			name: "welcome",
			component: () => import("../pages/WelcomePage.vue"),
		},
		{
			path: "/sky",
			name: "sky",
			component: () => import("../pages/SkyPage.vue"),
			meta: { requiresAuth: true },
		},
		{
			path: "/profile",
			name: "profile",
			component: () => import("../pages/ProfilePage.vue"),
			meta: { requiresAuth: true },
		},
		{
			path: "/folios",
			name: "folio-square",
			component: () => import("../pages/FolioSquare.vue"),
			meta: { requiresAuth: false }, // 访客可逛广场，只看公开/匿名/星河
		},
		{
			path: "/folios/:id",
			name: "folio-detail",
			component: () => import("../pages/FolioDetail.vue"),
			meta: { requiresAuth: false }, // 星河/公开星笺所有人可访问
			props: true,
		},
	],
});

router.beforeEach((to, _from, next) => {
	const token = localStorage.getItem("token");
	const welcomed = sessionStorage.getItem("welcomed");
	if (to.meta.requiresAuth && !token) {
		next("/");
	} else if (to.path === "/" && token) {
		next("/sky");
	} else if (to.path === "/" && !token && !welcomed) {
		// 首次访问：先看开场（会话内只跳转一次，刷新后不再重放）
		sessionStorage.setItem("welcomed", "1");
		next("/welcome");
	} else {
		next();
	}
});

export default router;
