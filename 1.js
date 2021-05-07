

class MyPromise {
	constructor(executor) {
		this.state = "panding"
		this.value = undefined   //成功的返回值
		this.reason = undefined	 //失败的返回值
		this.onreject = []
		this.onresolve = []
		resolve = function(value) {
			if (this.state === 'pending') {
				this.status = 'fullFilled'
				this.value = value
				// 发布执行函数
				this.onResolvedCallbacks.forEach(fn => fn())
			}
		}

		reject = function(reason) {
			if (this.state === 'pending') {
				this.status = 'rejected'
				this.reason = reason
				this.onResolvedCallbacks.forEach(fn => fn())
			}
		}

		try {
			// 执行函数
			executor(resolve, reject)
		} catch (err) {
			// 失败则直接执行reject函数
			reject(err)
		}
	}

}