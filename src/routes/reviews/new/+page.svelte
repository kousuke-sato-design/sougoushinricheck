<script lang="ts">
	import AppLayout from '$lib/components/AppLayout.svelte';
	import GoalBlock from '$lib/components/GoalBlock.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Document state
	let title = $state(form?.title || '');
	let description = $state(form?.description || '');
	let dueDate = $state(form?.dueDate || '');

	// Goals
	let selectedGoalIds = $state<string[]>([]);
	let showGoalSelector = $state(false);

	function toggleGoal(goalId: string) {
		if (selectedGoalIds.includes(goalId)) {
			selectedGoalIds = selectedGoalIds.filter(id => id !== goalId);
		} else {
			selectedGoalIds = [...selectedGoalIds, goalId];
		}
	}

	function removeGoal(goalId: string) {
		selectedGoalIds = selectedGoalIds.filter(id => id !== goalId);
	}

	const selectedGoals = $derived(
		data.goals.filter((g: { id: string }) => selectedGoalIds.includes(g.id))
	);

	// Blocks
	type Block = { id: string; type: 'url' | 'text' | 'check'; content: string; checked?: boolean };
	let blocks = $state<Block[]>(
		form?.targetUrls?.split('\n').filter(Boolean).map((url, i) => ({
			id: `block-${i}`,
			type: 'url' as const,
			content: url
		})) || []
	);

	let blockIdCounter = $state(blocks.length);

	function addBlock(type: 'url' | 'text' | 'check', afterId?: string) {
		const newBlock: Block = { id: `block-${blockIdCounter++}`, type, content: '', checked: type === 'check' ? false : undefined };
		if (afterId) {
			const index = blocks.findIndex(b => b.id === afterId);
			blocks = [...blocks.slice(0, index + 1), newBlock, ...blocks.slice(index + 1)];
		} else {
			blocks = [...blocks, newBlock];
		}
		// Focus the new input after render
		setTimeout(() => {
			const input = document.querySelector(`[data-block-id="${newBlock.id}"]`) as HTMLInputElement;
			input?.focus();
		}, 0);
	}

	function toggleBlockCheck(id: string) {
		blocks = blocks.map(b => b.id === id ? { ...b, checked: !b.checked } : b);
	}

	function removeBlock(id: string) {
		blocks = blocks.filter(b => b.id !== id);
	}

	function updateBlock(id: string, content: string) {
		blocks = blocks.map(b => b.id === id ? { ...b, content } : b);
	}

	function handleBlockKeydown(e: KeyboardEvent, block: Block) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			addBlock(block.type, block.id);
		}
		if (e.key === 'Backspace' && block.content === '' && blocks.length > 0) {
			e.preventDefault();
			const index = blocks.findIndex(b => b.id === block.id);
			removeBlock(block.id);
			// Focus previous block
			if (index > 0) {
				setTimeout(() => {
					const prevBlock = blocks[index - 1];
					const input = document.querySelector(`[data-block-id="${prevBlock?.id}"]`) as HTMLInputElement;
					input?.focus();
				}, 0);
			}
		}
	}

	// Tags
	let selectedTagIds = $state<string[]>(form?.selectedTags || []);
	let customTags = $state<string[]>(form?.customTags || []);
	let newTagInput = $state('');
	let showTagInput = $state(false);

	function toggleTag(tagId: string) {
		if (selectedTagIds.includes(tagId)) {
			selectedTagIds = selectedTagIds.filter(id => id !== tagId);
		} else {
			selectedTagIds = [...selectedTagIds, tagId];
		}
	}

	function addCustomTag() {
		const trimmed = newTagInput.trim();
		if (trimmed && !customTags.includes(trimmed)) {
			// Check if it already exists in data.tags
			const existingTag = data.tags.find(t => t.name === trimmed);
			if (existingTag) {
				if (!selectedTagIds.includes(existingTag.id)) {
					selectedTagIds = [...selectedTagIds, existingTag.id];
				}
			} else {
				customTags = [...customTags, trimmed];
			}
		}
		newTagInput = '';
		showTagInput = false;
	}

	function removeCustomTag(tag: string) {
		customTags = customTags.filter(t => t !== tag);
	}

	function handleTagInputKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addCustomTag();
		}
		if (e.key === 'Escape') {
			showTagInput = false;
			newTagInput = '';
		}
	}

	// Assignees
	let selectedAssignees = $state<string[]>(form?.assignees || []);
	function toggleAssignee(userId: string) {
		if (selectedAssignees.includes(userId)) {
			selectedAssignees = selectedAssignees.filter(id => id !== userId);
		} else {
			selectedAssignees = [...selectedAssignees, userId];
		}
	}

	// Block menu
	let showBlockMenu = $state(false);
	let blockMenuPosition = $state({ x: 0, y: 0 });
	let insertAfterBlockId = $state<string | undefined>(undefined);

	function openBlockMenu(e: MouseEvent, afterId?: string) {
		const rect = (e.target as HTMLElement).getBoundingClientRect();
		blockMenuPosition = { x: rect.left, y: rect.bottom + 8 };
		insertAfterBlockId = afterId;
		showBlockMenu = true;
	}

	function insertBlock(type: 'url' | 'text' | 'check') {
		addBlock(type, insertAfterBlockId);
		showBlockMenu = false;
	}

	// Close menu on outside click
	function handleOutsideClick(e: MouseEvent) {
		if (showBlockMenu) {
			showBlockMenu = false;
		}
	}
</script>

<svelte:window on:click={handleOutsideClick} />

<AppLayout user={data.user}>
	<div class="max-w-3xl mx-auto">
		{#if form?.error}
			<div class="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-r-xl flex items-center gap-3">
				<svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span class="font-medium">{form.error}</span>
			</div>
		{/if}

		<form method="POST">
			<!-- Document Container -->
			<div class="bg-white rounded-2xl shadow-xl border border-slate-200/50 min-h-[80vh]">
				<!-- Breadcrumb -->
				<div class="px-12 pt-8 pb-4">
					<div class="flex items-center gap-2 text-sm text-slate-400">
						<a href="/reviews" class="hover:text-slate-600 flex items-center gap-1">
							<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
							</svg>
							レビュー
						</a>
						<span>/</span>
						<span class="text-slate-600">新規ドキュメント</span>
					</div>
				</div>

				<!-- Cover Area (Optional visual) -->
				<div class="px-12 pb-4">
					<div class="flex items-center gap-4">
						<div class="w-16 h-16 bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
							<svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
						</div>
					</div>
				</div>

				<!-- Title -->
				<div class="px-12">
					<input
						type="text"
						name="title"
						required
						bind:value={title}
						placeholder="無題"
						class="w-full text-4xl font-bold text-slate-900 placeholder-slate-300 border-none outline-none bg-transparent"
					/>
				</div>

				<!-- Properties -->
				<div class="px-12 py-6 space-y-3">
					<!-- Tags -->
					<div class="flex items-start gap-4 group">
						<div class="w-24 shrink-0 text-sm text-slate-400 pt-1.5 flex items-center gap-2">
							<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
							</svg>
							タグ
						</div>
						<div class="flex-1 flex flex-wrap gap-2 items-center">
							<!-- Existing tags -->
							{#each data.tags as tag}
								<button
									type="button"
									onclick={() => toggleTag(tag.id)}
									class="px-3 py-1 rounded-md text-sm font-medium transition-all {selectedTagIds.includes(tag.id) ? 'shadow-sm' : 'opacity-40 hover:opacity-70'}"
									style="background-color: {tag.color}; color: white"
								>
									{tag.name}
								</button>
							{/each}
							<!-- Custom tags -->
							{#each customTags as tag}
								<span class="inline-flex items-center gap-1 px-3 py-1 bg-slate-600 text-white rounded-md text-sm font-medium">
									{tag}
									<button
										type="button"
										onclick={() => removeCustomTag(tag)}
										class="hover:bg-slate-500 rounded p-0.5"
									>
										<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</span>
							{/each}
							<!-- Add tag input -->
							{#if showTagInput}
								<input
									type="text"
									bind:value={newTagInput}
									onkeydown={handleTagInputKeydown}
									onblur={() => { if (newTagInput.trim()) addCustomTag(); else showTagInput = false; }}
									placeholder="タグ名を入力..."
									class="px-2 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
									autofocus
								/>
							{:else}
								<button
									type="button"
									onclick={() => showTagInput = true}
									class="px-3 py-1 border border-dashed border-slate-300 rounded-md text-sm text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
								>
									<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
									</svg>
									タグを追加
								</button>
							{/if}
						</div>
						{#each selectedTagIds as tagId}
							<input type="hidden" name="tags" value={tagId} />
						{/each}
						{#each customTags as tag}
							<input type="hidden" name="customTags" value={tag} />
						{/each}
					</div>

					<!-- Due Date -->
					<div class="flex items-center gap-4">
						<div class="w-24 shrink-0 text-sm text-slate-400 flex items-center gap-2">
							<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
							</svg>
							期限
						</div>
						<input
							type="date"
							name="dueDate"
							bind:value={dueDate}
							class="px-3 py-1 text-sm border border-slate-200 rounded-md hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<!-- Reviewers -->
					<div class="flex items-start gap-4">
						<div class="w-24 shrink-0 text-sm text-slate-400 pt-1.5 flex items-center gap-2">
							<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
							</svg>
							担当者
						</div>
						<div class="flex-1 flex flex-wrap gap-2">
							{#each data.users as user}
								<button
									type="button"
									onclick={() => toggleAssignee(user.id)}
									class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all {selectedAssignees.includes(user.id) ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500 ring-offset-1' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
								>
									<div class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white {selectedAssignees.includes(user.id) ? 'bg-blue-500' : 'bg-slate-400'}">
										{user.name.charAt(0)}
									</div>
									{user.name}
								</button>
							{/each}
							{#if data.users.length === 0}
								<span class="text-slate-400 text-sm">メンバーなし</span>
							{/if}
						</div>
						{#each selectedAssignees as assigneeId}
							<input type="hidden" name="assignees" value={assigneeId} />
						{/each}
					</div>
				</div>

				<!-- Related Goals -->
				{#if selectedGoals.length > 0}
					<div class="px-12 py-4 space-y-3">
						{#each selectedGoals as goal}
							<GoalBlock {goal} showRemove={true} onRemove={() => removeGoal(goal.id)} />
							<input type="hidden" name="goals" value={goal.id} />
						{/each}
					</div>
				{/if}

				<!-- Divider -->
				<div class="mx-12 border-t border-slate-200"></div>

				<!-- Content Blocks -->
				<div class="px-12 py-8">
					<!-- Description -->
					<div class="mb-6">
						<textarea
							name="description"
							bind:value={description}
							placeholder="依頼内容を入力してください..."
							rows="3"
							class="w-full text-slate-700 placeholder-slate-400 border-none outline-none bg-transparent resize-none text-base leading-relaxed"
						></textarea>
					</div>

					<!-- URL Blocks -->
					<div class="space-y-2">
						{#each blocks as block, index (block.id)}
							<div class="group flex items-center gap-2 -ml-8">
								<!-- Drag handle + Add button -->
								<div class="w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
									<button
										type="button"
										onclick={(e) => { e.stopPropagation(); openBlockMenu(e, blocks[index - 1]?.id); }}
										class="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
									>
										<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
										</svg>
									</button>
								</div>

								<!-- Block Content -->
								{#if block.type === 'url'}
									<div class="flex-1 flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
										<div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
											<svg class="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
											</svg>
										</div>
										<input
											type="url"
											name="targetUrls"
											data-block-id={block.id}
											value={block.content}
											oninput={(e) => updateBlock(block.id, e.currentTarget.value)}
											onkeydown={(e) => handleBlockKeydown(e, block)}
											placeholder="URLを入力..."
											class="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder-slate-400"
										/>
										<button
											type="button"
											onclick={() => removeBlock(block.id)}
											class="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
										>
											<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</div>
								{:else if block.type === 'check'}
									<div class="flex-1 flex items-start gap-3 p-3 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors">
										<button
											type="button"
											onclick={() => toggleBlockCheck(block.id)}
											class="w-6 h-6 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors {block.checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-emerald-400'}"
										>
											{#if block.checked}
												<svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
												</svg>
											{/if}
										</button>
										<div class="flex-1">
											<input
												type="text"
												name="checkItems"
												data-block-id={block.id}
												value={block.content}
												oninput={(e) => updateBlock(block.id, e.currentTarget.value)}
												onkeydown={(e) => handleBlockKeydown(e, block)}
												placeholder="確認項目を入力..."
												class="w-full bg-transparent border-none outline-none text-slate-700 placeholder-slate-400 font-medium {block.checked ? 'line-through text-slate-400' : ''}"
											/>
											<p class="text-xs text-amber-600 mt-1">レビュワーがチェックできる確認項目</p>
										</div>
										<input type="hidden" name="checkItemsChecked" value={block.checked ? '1' : '0'} />
										<button
											type="button"
											onclick={() => removeBlock(block.id)}
											class="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
										>
											<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</div>
								{:else}
									<div class="flex-1 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
										<textarea
											name="textBlock"
											data-block-id={block.id}
											value={block.content}
											oninput={(e) => updateBlock(block.id, e.currentTarget.value)}
											onkeydown={(e) => handleBlockKeydown(e, block)}
											placeholder="テキストを入力..."
											rows="2"
											class="w-full bg-transparent border-none outline-none text-slate-700 placeholder-slate-400 resize-none"
										></textarea>
									</div>
								{/if}
							</div>
						{/each}
					</div>

					<!-- Add Block Button -->
					<div class="mt-4">
						<button
							type="button"
							onclick={(e) => { e.stopPropagation(); openBlockMenu(e, blocks[blocks.length - 1]?.id); }}
							class="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
						>
							<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
							</svg>
							<span class="text-sm">ブロックを追加</span>
						</button>
					</div>

					<!-- Supported formats hint -->
					{#if blocks.some(b => b.type === 'url')}
						<div class="mt-6 flex flex-wrap gap-2 text-xs">
							<span class="text-slate-400">対応:</span>
							<span class="px-2 py-0.5 bg-slate-100 text-slate-500 rounded">Web</span>
							<span class="px-2 py-0.5 bg-red-100 text-red-600 rounded">YouTube</span>
							<span class="px-2 py-0.5 bg-blue-100 text-blue-600 rounded">Vimeo</span>
							<span class="px-2 py-0.5 bg-purple-100 text-purple-600 rounded">動画</span>
							<span class="px-2 py-0.5 bg-green-100 text-green-600 rounded">画像</span>
							<span class="px-2 py-0.5 bg-violet-100 text-violet-600 rounded">Figma</span>
						</div>
					{/if}
				</div>

				<!-- Footer -->
				<div class="px-12 py-6 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
					<div class="flex items-center justify-between">
						<div class="text-sm text-slate-500">
							{#if blocks.filter(b => b.type === 'url' && b.content).length > 0}
								<span class="inline-flex items-center gap-1">
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
									</svg>
									{blocks.filter(b => b.type === 'url' && b.content).length} URL
								</span>
							{/if}
							{#if selectedAssignees.length > 0}
								<span class="inline-flex items-center gap-1 ml-4">
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
									</svg>
									{selectedAssignees.length} 担当者
								</span>
							{/if}
						</div>
						<div class="flex items-center gap-3">
							<a href="/reviews" class="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors">
								キャンセル
							</a>
							<button
								type="submit"
								formaction="?/saveOnly"
								class="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors flex items-center gap-2"
							>
								<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
								</svg>
								保存
							</button>
							<button
								type="submit"
								class="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors shadow-sm flex items-center gap-2"
							>
								チェック依頼を送る
								<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
								</svg>
							</button>
						</div>
					</div>
				</div>
			</div>
		</form>
	</div>

	<!-- Block Menu Popup -->
	{#if showBlockMenu}
		<div
			class="fixed z-50 bg-white rounded-xl shadow-xl border border-slate-200 py-2 w-56"
			style="left: {blockMenuPosition.x}px; top: {blockMenuPosition.y}px"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase">ブロック</div>
			<button
				type="button"
				onclick={() => insertBlock('url')}
				class="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-100 transition-colors"
			>
				<div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
					<svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
					</svg>
				</div>
				<div class="text-left">
					<div class="font-medium text-slate-800">URL</div>
					<div class="text-xs text-slate-500">Webページや動画のリンク</div>
				</div>
			</button>
			<button
				type="button"
				onclick={() => insertBlock('text')}
				class="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-100 transition-colors"
			>
				<div class="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
					<svg class="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
					</svg>
				</div>
				<div class="text-left">
					<div class="font-medium text-slate-800">テキスト</div>
					<div class="text-xs text-slate-500">説明やメモを追加</div>
				</div>
			</button>
			<button
				type="button"
				onclick={() => insertBlock('check')}
				class="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-100 transition-colors"
			>
				<div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
					<svg class="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<div class="text-left">
					<div class="font-medium text-slate-800">チェック項目</div>
					<div class="text-xs text-slate-500">確認項目を追加</div>
				</div>
			</button>
			<div class="border-t border-slate-100 my-1"></div>
			<button
				type="button"
				onclick={() => { showBlockMenu = false; showGoalSelector = true; }}
				class="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-100 transition-colors"
			>
				<div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
					<svg class="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
					</svg>
				</div>
				<div class="text-left">
					<div class="font-medium text-slate-800">プロジェクト</div>
					<div class="text-xs text-slate-500">目標を紐付け</div>
				</div>
			</button>
		</div>
	{/if}

	<!-- Goal Selector Modal -->
	{#if showGoalSelector}
		<div class="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4" onclick={() => showGoalSelector = false}>
			<div class="bg-white rounded-xl shadow-xl max-w-lg w-full p-6" onclick={(e) => e.stopPropagation()}>
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-semibold text-gray-900">プロジェクトを紐付け</h3>
					<button
						type="button"
						class="text-gray-400 hover:text-gray-600"
						onclick={() => showGoalSelector = false}
					>
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
				<div class="space-y-2 max-h-80 overflow-y-auto">
					{#each data.goals as goal}
						<button
							type="button"
							class="w-full text-left p-3 rounded-lg border transition-colors {selectedGoalIds.includes(goal.id) ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}"
							onclick={() => toggleGoal(goal.id)}
						>
							<div class="flex items-center gap-3">
								<div class="w-3 h-3 rounded-full" style="background-color: {goal.color}"></div>
								<div class="flex-1">
									<div class="font-medium text-gray-900">{goal.title}</div>
									<div class="text-xs text-gray-500">
										期限: {new Date(goal.due_date).toLocaleDateString('ja-JP')}
									</div>
								</div>
								{#if selectedGoalIds.includes(goal.id)}
									<svg class="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
									</svg>
								{/if}
							</div>
						</button>
					{:else}
						<p class="text-center text-gray-500 py-4">プロジェクトがありません</p>
					{/each}
				</div>
				<div class="mt-4 flex justify-end gap-3">
					<button
						type="button"
						class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
						onclick={() => showGoalSelector = false}
					>
						閉じる
					</button>
					<a
						href="/goals/new"
						class="px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg"
					>
						+ 新規プロジェクト作成
					</a>
				</div>
			</div>
		</div>
	{/if}
</AppLayout>
