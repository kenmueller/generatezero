<script lang="ts">
	interface WorkerStatus {
		min: number
		iteration: number
		latestIteration: number
	}

	let workerCount: number | null = 50
	let updateIterations: number | null = 50_000_000
	let workers: Worker[] | null = null
	let workerStatuses: (WorkerStatus | null)[] | null = null

	let start: number | null = null
	let current: number | null = null

	let latestInterval: number | null = null

	$: minWorkerIndex =
		workerStatuses?.reduce((minWorkerIndex, workerStatus, workerIndex) => {
			if (!workerStatus) return minWorkerIndex

			const minWorker = workerStatuses![minWorkerIndex]

			return !minWorker || workerStatus.min < minWorker.min ? workerIndex : minWorkerIndex
		}, 0) ?? null

	$: totalIterations =
		workerStatuses?.reduce(
			(totalIterations, workerStatus) => totalIterations + (workerStatus?.latestIteration ?? 0),
			0
		) ?? null

	const generate = () => {
		if (!(workerCount && updateIterations))
			throw new Error('Missing worker count or update iterations')

		workers = new Array(workerCount)
			.fill(undefined)
			.map(() => new Worker('/generate.worker.js', { type: 'module' }))

		workerStatuses = new Array(workerCount).fill(null)

		for (let workerIndex = 0; workerIndex < workers.length; workerIndex++) {
			const worker = workers[workerIndex]

			worker.addEventListener('message', ({ data }) => {
				switch (data.type) {
					case 'min':
						workerStatuses![workerIndex] = {
							...data.value,
							latestIteration: data.value.iteration
						}

						break
					case 'iteration': {
						const status = workerStatuses![workerIndex]
						if (!status) break

						workerStatuses![workerIndex] = {
							...status,
							latestIteration: data.value
						}

						break
					}
				}
			})

			worker.postMessage({ type: 'update-iterations', value: updateIterations })
		}

		start = Date.now()

		latestInterval = window.setInterval(() => {
			if (!workers) return
			current = Date.now()
		}, 1000)
	}

	const terminate = () => {
		if (!workers) throw new Error('Missing workers')

		for (const worker of workers) {
			worker.terminate()
		}

		workers = null
		workerStatuses = null

		start = null
		current = null

		if (latestInterval !== null) {
			clearInterval(latestInterval)
			latestInterval = null
		}
	}
</script>

<h1>generatezero</h1>

<form on:submit|preventDefault={generate}>
	<label>
		<input type="number" bind:value={workerCount} disabled={!!workers} min={1} max={500} />
		workers
	</label>
	<label>
		update every
		<input type="number" bind:value={updateIterations} disabled={!!workers} min={1} />
		iterations
	</label>
	<button disabled={!workerCount || !updateIterations || !!workers}>Generate</button>
</form>

{#if workers && workerStatuses && start !== null && current !== null && minWorkerIndex !== null && totalIterations !== null}
	<div class="status">
		<p>
			Generating... elapsed: {Math.round((current - start) / 1000)}s min: {workerStatuses[
				minWorkerIndex
			]?.min.toFixed(16) ?? 'loading...'} total iterations: {totalIterations.toLocaleString()}
		</p>
		<button on:click={terminate}>Terminate</button>
	</div>
	<div>
		{#each workerStatuses as workerStatus, workerIndex}
			<p class:min={minWorkerIndex === workerIndex}>
				<strong>Worker #{workerIndex + 1}</strong>
				{#if workerStatus}
					min: {workerStatus.min.toFixed(16)} on iteration: {(
						workerStatus.iteration + 1
					).toLocaleString()} with latest iteration: {(
						workerStatus.latestIteration + 1
					).toLocaleString()}
				{:else}
					loading...
				{/if}
			</p>
		{/each}
	</div>
{/if}

<style lang="scss">
	.status {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.min {
		color: white;
		background: blue;
	}
</style>
