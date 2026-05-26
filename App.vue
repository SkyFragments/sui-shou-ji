<script>
	import { initAllData } from './utils/init-data'

	export default {
		onLaunch: function() {
			console.log('App Launch - 随手记启动')
			console.log('页面数量:', getCurrentPages().length)
			// 初始化默认数据
			initAllData()
			// 验证 CSS 变量 - 使用 dom 获取 computed style
			const bgColor = '#FDF4E9'
			console.log('[App] 背景色变量验证:', bgColor)
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
/* 每个页面公共css */
@import "./common/style.scss";
</style>