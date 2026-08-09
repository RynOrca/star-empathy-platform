import { ref } from "vue";

/**
 * 入场闪烁噪点（200ms 三次闪烁）
 * 开场页挂载时调用 start()，给暗角噪点层加 .on 类触发 CSS 闪烁动画，
 * 模拟「老电影放映」式噪点闪烁，与电影遮幅的开场气质一致。
 */
export function useFlickerVignette() {
	const flickerOn = ref(false);
	let timer: ReturnType<typeof setTimeout> | null = null;

	function start() {
		if (timer) clearTimeout(timer);
		flickerOn.value = true;
		timer = setTimeout(() => {
			flickerOn.value = false;
			timer = null;
		}, 230);
	}

	return { flickerOn, start };
}
