<script lang="ts">
	import AppLayout from '$lib/components/AppLayout.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let title = $state('');
	let titleEmoji = $state('📄');
	let description = $state('');
	let showEmojiPicker = $state(false);

	// Popular emojis for documents
	const emojis = [
		'📄', '📝', '📋', '📌', '📎', '🎯', '🎬', '🎥', '📺', '🎵',
		'💡', '⭐', '🔥', '✨', '💫', '🚀', '💪', '👍', '✅', '❌',
		'⚠️', '📢', '💬', '📊', '📈', '📉', '🗂️', '📁', '🔗', '🌐',
		'🎨', '🖼️', '📸', '🎤', '🎧', '💻', '📱', '⚙️', '🔧', '🔑',
		'📅', '⏰', '🕐', '📍', '🏠', '🏢', '👥', '👤', '💼', '📧'
	];

	// Block templates (Notion-style callouts - just emoji, user types content)
	const blockTemplates = [
		{ emoji: '💡', label: '黄色', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' },
		{ emoji: '📌', label: '赤', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' },
		{ emoji: 'ℹ️', label: '青', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
		{ emoji: '✅', label: '緑', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' },
		{ emoji: '⚠️', label: 'オレンジ', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800' },
		{ emoji: '🚀', label: '紫', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800' },
	];

	// Current callout being edited (emoji prefix for the next line)
	let currentCalloutEmoji = $state<string | null>(null);

	// Heading templates
	const headingTemplates = [
		{ icon: 'H1', label: '見出し1', insert: '# ', preview: 'text-2xl font-bold' },
		{ icon: 'H2', label: '見出し2', insert: '## ', preview: 'text-xl font-semibold' },
		{ icon: 'H3', label: '見出し3', insert: '### ', preview: 'text-lg font-medium' },
	];

	// List templates
	const listTemplates = [
		{ icon: '•', label: '箇条書き', insert: '• ' },
		{ icon: '☐', label: 'チェック', insert: '☐ ' },
		{ icon: '1.', label: '番号', insert: '1. ' },
		{ icon: '>', label: '引用', insert: '> ' },
	];

	function selectEmoji(emoji: string) {
		titleEmoji = emoji;
		showEmojiPicker = false;
	}

	let lineInputRef = $state<HTMLInputElement | null>(null);
	let currentPrefix = $state<string | null>(null); // For headings/lists

	function setPrefix(prefix: string) {
		currentPrefix = prefix;
		currentCalloutEmoji = null;
		if (lineInputRef) lineInputRef.focus();
	}

	function insertDivider() {
		const needsNewline = description.length > 0 && !description.endsWith('\n');
		description = description + (needsNewline ? '\n' : '') + '---\n';
	}

	// Extract YouTube video ID from URL
	function extractYouTubeId(text: string): string | null {
		const patterns = [
			/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
			/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
		];

		for (const pattern of patterns) {
			const match = text.match(pattern);
			if (match) return match[1];
		}
		return null;
	}

	let youtubeId = $derived(extractYouTubeId(description));

	// Render description with formatting (Notion-style callouts)
	function renderFormattedText(text: string): string {
		return text
			.split('\n')
			.map(line => {
				// Callouts with emoji
				if (line.startsWith('💡 ')) return `<div class="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg my-2"><span class="text-xl">💡</span><span class="text-amber-800">${line.slice(2)}</span></div>`;
				if (line.startsWith('📌 ')) return `<div class="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-lg my-2"><span class="text-xl">📌</span><span class="text-red-800">${line.slice(2)}</span></div>`;
				if (line.startsWith('ℹ️ ')) return `<div class="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg my-2"><span class="text-xl">ℹ️</span><span class="text-blue-800">${line.slice(3)}</span></div>`;
				if (line.startsWith('✅ ')) return `<div class="flex gap-3 p-3 bg-green-50 border border-green-200 rounded-lg my-2"><span class="text-xl">✅</span><span class="text-green-800">${line.slice(2)}</span></div>`;
				if (line.startsWith('⚠️ ')) return `<div class="flex gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg my-2"><span class="text-xl">⚠️</span><span class="text-orange-800">${line.slice(3)}</span></div>`;
				if (line.startsWith('🚀 ')) return `<div class="flex gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg my-2"><span class="text-xl">🚀</span><span class="text-purple-800">${line.slice(2)}</span></div>`;
				// Headings
				if (line.startsWith('### ')) return `<h3 class="text-lg font-semibold text-slate-800 mt-4 mb-2">${line.slice(4)}</h3>`;
				if (line.startsWith('## ')) return `<h2 class="text-xl font-semibold text-slate-800 mt-4 mb-2">${line.slice(3)}</h2>`;
				if (line.startsWith('# ')) return `<h1 class="text-2xl font-bold text-slate-900 mt-4 mb-2">${line.slice(2)}</h1>`;
				// Lists
				if (line.startsWith('• ')) return `<div class="flex gap-2 ml-4"><span>•</span><span>${line.slice(2)}</span></div>`;
				if (line.startsWith('☐ ')) return `<div class="flex gap-2 ml-4"><span class="text-slate-400">☐</span><span>${line.slice(2)}</span></div>`;
				if (line.startsWith('☑ ')) return `<div class="flex gap-2 ml-4"><span class="text-green-600">☑</span><span class="line-through text-slate-400">${line.slice(2)}</span></div>`;
				if (line.match(/^\d+\. /)) return `<div class="flex gap-2 ml-4"><span class="text-slate-500">${line.match(/^\d+/)?.[0]}.</span><span>${line.replace(/^\d+\. /, '')}</span></div>`;
				if (line.startsWith('> ')) return `<blockquote class="border-l-4 border-slate-300 pl-4 text-slate-600 italic my-2">${line.slice(2)}</blockquote>`;
				if (line === '---') return `<hr class="my-4 border-slate-200" />`;
				if (line === '') return `<div class="h-2"></div>`;
				return `<p class="my-1">${line}</p>`;
			})
			.join('');
	}

	let formattedPreview = $derived(renderFormattedText(description));
</script>

<AppLayout user={data.user}>
	<div class="max-w-3xl mx-auto">
		{#if form?.error}
			<div class="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-r-xl">
				{form.error}
			</div>
		{/if}

		<form method="POST">
			<input type="hidden" name="emoji" value={titleEmoji} />
			<div class="bg-white rounded-2xl shadow-xl border border-slate-200/50 min-h-[60vh]">
				<!-- Header -->
				<div class="px-12 pt-8 pb-4">
					<a href="/reviews" class="text-sm text-slate-400 hover:text-slate-600">
						&larr; ドキュメント一覧に戻る
					</a>
				</div>

				<!-- Emoji Icon (clickable) -->
				<div class="px-12 pb-4 relative">
					<button
						type="button"
						onclick={() => showEmojiPicker = !showEmojiPicker}
						class="w-20 h-20 bg-slate-100 hover:bg-slate-200 rounded-2xl flex items-center justify-center text-5xl transition-colors cursor-pointer"
						title="絵文字を変更"
					>
						{titleEmoji}
					</button>

					<!-- Emoji Picker -->
					{#if showEmojiPicker}
						<div class="absolute top-24 left-12 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-50 w-80">
							<p class="text-sm text-slate-500 mb-3">絵文字を選択</p>
							<div class="grid grid-cols-10 gap-1">
								{#each emojis as emoji}
									<button
										type="button"
										onclick={() => selectEmoji(emoji)}
										class="w-8 h-8 flex items-center justify-center text-xl hover:bg-slate-100 rounded cursor-pointer"
									>
										{emoji}
									</button>
								{/each}
							</div>
						</div>
					{/if}
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

				<!-- Divider -->
				<div class="mx-12 mt-6 border-t border-slate-200"></div>

				<!-- Block Templates -->
				<div class="px-12 pt-6">
					<p class="text-xs text-slate-400 mb-3">コールアウト</p>

					<!-- Callout Templates -->
					<div class="flex flex-wrap gap-2 mb-4">
						{#each blockTemplates as block}
							<button
								type="button"
								onclick={() => {
									currentCalloutEmoji = block.emoji;
									currentPrefix = null;
									if (lineInputRef) lineInputRef.focus();
								}}
								class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all hover:scale-105 {currentCalloutEmoji === block.emoji ? 'ring-2 ring-offset-1 ring-blue-500' : ''} {block.bg} {block.border} {block.text}"
							>
								<span>{block.emoji}</span>
								<span>{block.label}</span>
							</button>
						{/each}
						{#if currentCalloutEmoji}
							<button
								type="button"
								onclick={() => currentCalloutEmoji = null}
								class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-sm hover:bg-slate-100"
							>
								解除
							</button>
						{/if}
					</div>

					<!-- Heading & List Templates -->
					<p class="text-xs text-slate-400 mb-3 mt-4">見出し・リスト</p>
					<div class="flex flex-wrap gap-2 mb-4">
						{#each headingTemplates as h}
							<button
								type="button"
								onclick={() => setPrefix(h.insert)}
								class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all {currentPrefix === h.insert ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-offset-1 ring-blue-500' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}"
							>
								<span class="font-mono font-bold text-xs w-5">{h.icon}</span>
								<span>{h.label}</span>
							</button>
						{/each}
						<span class="text-slate-300 mx-1">|</span>
						{#each listTemplates as item}
							<button
								type="button"
								onclick={() => setPrefix(item.insert)}
								class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all {currentPrefix === item.insert ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-offset-1 ring-blue-500' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}"
							>
								<span class="font-mono text-xs w-4">{item.icon}</span>
								<span>{item.label}</span>
							</button>
						{/each}
						<button
							type="button"
							onclick={() => insertDivider()}
							class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-sm hover:bg-slate-100 transition-all"
						>
							<span class="font-mono text-xs">—</span>
							<span>区切り</span>
						</button>
						{#if currentPrefix}
							<button
								type="button"
								onclick={() => currentPrefix = null}
								class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-sm hover:bg-slate-100"
							>
								解除
							</button>
						{/if}
					</div>
				</div>

				<!-- Content Area (Notion-style - unified view) -->
				<div class="px-12 py-6 min-h-[400px]">
					<textarea
						name="description"
						bind:value={description}
						class="hidden"
					></textarea>

					<!-- Formatted Content Display -->
					<div class="prose prose-slate max-w-none text-base leading-relaxed">
						{#if description}
							{@html formattedPreview}
						{/if}

						<!-- YouTube Preview inline -->
						{#if youtubeId}
							<div class="my-4 rounded-xl overflow-hidden">
								<div class="aspect-video bg-black">
									<iframe
										src="https://www.youtube.com/embed/{youtubeId}"
										title="YouTube video preview"
										frameborder="0"
										allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
										allowfullscreen
										class="w-full h-full"
									></iframe>
								</div>
							</div>
						{/if}
					</div>

					<!-- New line input (always visible at bottom) -->
					<div class="mt-2 flex items-center gap-2">
						{#if currentCalloutEmoji}
							<span class="text-xl">{currentCalloutEmoji}</span>
						{:else if currentPrefix}
							<span class="text-slate-400 font-mono text-sm">{currentPrefix.trim()}</span>
						{/if}
						<input
							type="text"
							bind:this={lineInputRef}
							placeholder={currentCalloutEmoji ? 'コールアウトの内容...' : currentPrefix ? '内容を入力...' : (description ? '続きを入力...' : '内容を入力...')}
							class="flex-1 py-2 text-slate-700 placeholder-slate-400 border-none outline-none bg-transparent text-base {currentCalloutEmoji || currentPrefix ? 'bg-slate-50 px-3 rounded-lg' : ''}"
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									const input = e.currentTarget as HTMLInputElement;
									if (input.value.trim()) {
										let prefix = '';
										if (currentCalloutEmoji) {
											prefix = currentCalloutEmoji + ' ';
										} else if (currentPrefix) {
											prefix = currentPrefix;
										}
										description = description + (description ? '\n' : '') + prefix + input.value;
										input.value = '';
									}
								} else if (e.key === 'Escape') {
									currentCalloutEmoji = null;
									currentPrefix = null;
								}
							}}
						/>
					</div>
				</div>

				<!-- Footer -->
				<div class="px-12 py-6 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex justify-end gap-3">
					<a href="/reviews" class="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg">
						キャンセル
					</a>
					<button
						type="submit"
						class="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
					>
						ドキュメント保存
					</button>
				</div>
			</div>
		</form>
	</div>

	<!-- Click outside to close emoji picker -->
	{#if showEmojiPicker}
		<button
			type="button"
			class="fixed inset-0 z-40"
			onclick={() => showEmojiPicker = false}
		></button>
	{/if}
</AppLayout>
