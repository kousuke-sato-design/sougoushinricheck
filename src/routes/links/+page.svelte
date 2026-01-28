<script lang="ts">
	import AppLayout from '$lib/components/AppLayout.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let isAdding = $state(false);
	let editingId = $state<string | null>(null);

	// Form fields
	let title = $state('');
	let description = $state('');
	let url = $state('');
	let selectedColor = $state('2196F3');

	// Color palette
	const colorPalette = [
		{ name: 'Blue', value: '2196F3' },
		{ name: 'Dark Blue', value: '1565C0' },
		{ name: 'Navy', value: '0D47A1' },
		{ name: 'Light Blue', value: '03A9F4' },
		{ name: 'Cyan', value: '00BCD4' },
		{ name: 'Teal', value: '009688' },
		{ name: 'Green', value: '4CAF50' },
		{ name: 'Light Green', value: '8BC34A' },
		{ name: 'Orange', value: 'FF9800' },
		{ name: 'Deep Orange', value: 'FF5722' },
		{ name: 'Red', value: 'F44336' },
		{ name: 'Pink', value: 'E91E63' },
		{ name: 'Purple', value: '9C27B0' },
		{ name: 'Deep Purple', value: '673AB7' },
		{ name: 'Gray', value: '607D8B' },
	];

	function getTitleFontSize(text: string): string {
		const len = text.length;
		if (len <= 6) return 'text-4xl';
		if (len <= 10) return 'text-3xl';
		if (len <= 15) return 'text-2xl';
		if (len <= 20) return 'text-xl';
		return 'text-lg';
	}

	function openAddForm() {
		title = '';
		description = '';
		url = '';
		selectedColor = '2196F3';
		isAdding = true;
		editingId = null;
	}

	function openEditForm(link: typeof data.links[0]) {
		title = link.title as string;
		description = (link.description as string) || '';
		url = link.url as string;
		selectedColor = (link.color as string) || '2196F3';
		editingId = link.id as string;
		isAdding = false;
	}

	function closeForm() {
		isAdding = false;
		editingId = null;
	}
</script>

<AppLayout user={data.user}>
	<div class="max-w-6xl mx-auto">
		<div class="flex items-center justify-between mb-8">
			<div>
				<h1 class="text-3xl font-bold text-slate-900">システムリンク</h1>
				<p class="text-slate-500 mt-1">よく使うシステムへのリンク集</p>
			</div>
			<button
				onclick={openAddForm}
				class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
			>
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				新しいリンク
			</button>
		</div>

		{#if form?.error}
			<div class="mb-6 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
				{form.error}
			</div>
		{/if}

		<!-- Add/Edit Form Modal -->
		{#if isAdding || editingId}
			<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={closeForm}>
				<div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
					<h3 class="text-xl font-bold mb-4 text-slate-900">
						{isAdding ? '新しいリンクを追加' : 'リンクを編集'}
					</h3>

					<form method="POST" action={isAdding ? '?/create' : '?/update'} class="space-y-4">
						{#if editingId}
							<input type="hidden" name="id" value={editingId} />
						{/if}
						<input type="hidden" name="color" value={selectedColor} />

						<div>
							<label for="title" class="block text-sm font-medium text-slate-700 mb-1">
								タイトル <span class="text-red-500">*</span>
							</label>
							<input
								type="text"
								id="title"
								name="title"
								bind:value={title}
								required
								class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								placeholder="例: Googleドキュメント"
							/>
						</div>

						<div>
							<label for="url" class="block text-sm font-medium text-slate-700 mb-1">
								URL <span class="text-red-500">*</span>
							</label>
							<input
								type="url"
								id="url"
								name="url"
								bind:value={url}
								required
								class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								placeholder="https://example.com"
							/>
						</div>

						<div>
							<label for="description" class="block text-sm font-medium text-slate-700 mb-1">
								説明
							</label>
							<textarea
								id="description"
								name="description"
								bind:value={description}
								rows="2"
								class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								placeholder="リンクの説明を入力してください"
							></textarea>
						</div>

						<!-- Color Palette -->
						<div>
							<p class="block text-sm font-medium text-slate-700 mb-2">背景色</p>
							<div class="grid grid-cols-8 gap-2">
								{#each colorPalette as color}
									<button
										type="button"
										onclick={() => selectedColor = color.value}
										class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 {selectedColor === color.value ? 'border-slate-900 ring-2 ring-offset-2 ring-blue-500' : 'border-transparent'}"
										style="background-color: #{color.value}"
										title={color.name}
									></button>
								{/each}
							</div>
						</div>

						<!-- Preview -->
						{#if title}
							<div>
								<p class="block text-sm font-medium text-slate-700 mb-2">プレビュー</p>
								<div
									class="aspect-video w-full max-w-[200px] rounded-lg overflow-hidden flex items-center justify-center p-2"
									style="background-color: #{selectedColor}"
								>
									<span class="text-white font-bold {getTitleFontSize(title)} text-center leading-tight break-words max-w-full drop-shadow-md">
										{title}
									</span>
								</div>
							</div>
						{/if}

						<div class="flex gap-3 pt-2">
							<button
								type="submit"
								class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
							>
								{isAdding ? 'リンク登録' : '保存'}
							</button>
							<button
								type="button"
								onclick={closeForm}
								class="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-4 rounded-lg transition-colors"
							>
								キャンセル
							</button>
						</div>
					</form>
				</div>
			</div>
		{/if}

		<!-- Links Grid -->
		{#if data.links.length === 0}
			<div class="text-center py-16 bg-white rounded-2xl border border-slate-200">
				<div class="text-6xl mb-4">🔗</div>
				<p class="text-xl text-slate-500">まだリンクがありません</p>
				<p class="text-slate-400 mt-2">上のボタンから追加してください</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each data.links as link}
					<div class="relative group bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
						<!-- Edit/Delete buttons -->
						<div class="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
							<button
								onclick={() => openEditForm(link)}
								class="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg"
								title="編集"
							>
								<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
									<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
								</svg>
							</button>
							<form method="POST" action="?/delete" class="inline">
								<input type="hidden" name="id" value={link.id} />
								<button
									type="submit"
									onclick={(e) => { if (!confirm(`「${link.title}」を削除しますか？`)) e.preventDefault(); }}
									class="bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg"
									title="削除"
								>
									<svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
									</svg>
								</button>
							</form>
						</div>

						<a href={link.url as string} target="_blank" rel="noopener noreferrer" class="block">
							<div
								class="aspect-video w-full flex items-center justify-center p-4 group-hover:brightness-110 transition-all duration-300"
								style="background-color: #{link.color || '2196F3'}"
							>
								<span class="text-white font-bold {getTitleFontSize(link.title as string)} text-center leading-tight break-words max-w-full drop-shadow-md">
									{link.title}
								</span>
							</div>
							<div class="p-5">
								<h3 class="text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
									{link.title}
								</h3>
								{#if link.description}
									<p class="text-slate-500 text-sm line-clamp-2">
										{link.description}
									</p>
								{/if}
							</div>
						</a>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</AppLayout>
