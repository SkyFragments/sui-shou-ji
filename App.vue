<script>
	import { initAllData } from './utils/init-data'

	export default {
		onLaunch: function() {
			console.log('App Launch')
			// 初始化默认数据
			initAllData()
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
	/*每个页面公共css */
</style>