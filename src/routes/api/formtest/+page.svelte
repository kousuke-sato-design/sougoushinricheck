<script lang="ts">
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<div class="p-8 max-w-xl mx-auto">
	<h1 class="text-2xl font-bold mb-4">Form Action Test</h1>

	<form method="POST" class="space-y-4">
		<div>
			<label class="block text-sm font-medium text-gray-700">Test Value</label>
			<input type="text" name="testValue" value="Hello World" class="mt-1 block w-full border border-gray-300 rounded-md p-2" />
		</div>
		<button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
			Submit
		</button>
	</form>

	{#if form}
		<div class="mt-6 p-4 {form.success ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500'} border rounded-md">
			<h2 class="font-bold mb-2">{form.success ? 'Success!' : 'Error!'}</h2>
			{#if form.error}
				<p class="text-red-700 mb-2">{form.error}</p>
			{/if}
			<h3 class="font-medium mt-2">Steps:</h3>
			<ul class="list-disc list-inside text-sm">
				{#each form.steps || [] as step}
					<li>{step}</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
