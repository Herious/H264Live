const a = require('./1')

class b extends a {
	constructor() {
		super()
	}

	sayName() {
		console.log(this.name)
	}
}

module.exports = new b;