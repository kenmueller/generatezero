let min = Math.random()
let iteration = 0

const postMin = () => {
	postMessage({ type: 'min', value: { min, iteration } })
}

const postIteration = () => {
	postMessage({ type: 'iteration', value: iteration })
}

const start = (updateIterations) => {
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const current = Math.random()

		if (current < min) {
			min = current
			postMin()
		} else if ((iteration + 1) % updateIterations === 0) {
			postIteration()
		}

		iteration++
	}
}

postMin()

addEventListener('message', ({ data }) => {
	switch (data.type) {
		case 'update-iterations':
			start(data.value)
			break
	}
})
