<script lang="ts">
	import AppLayout from '$lib/components/AppLayout.svelte';
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const statusLabels: Record<string, string> = {
		draft: '下書き',
		shared: 'URL発行済',
		pending: '確認依頼中',
		in_review: '確認中',
		approved: '確認OK',
		rejected: '差し戻し'
	};

	const statusColors: Record<string, string> = {
		draft: 'bg-slate-100 text-slate-600',
		shared: 'bg-purple-100 text-purple-700',
		pending: 'bg-amber-100 text-amber-700',
		in_review: 'bg-blue-100 text-blue-700',
		approved: 'bg-emerald-100 text-emerald-700',
		rejected: 'bg-red-100 text-red-700'
	};

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Notion-style formatting
	function renderFormattedText(text: string): string {
		if (!text) return '';
		return text
			.split('\n')
			.map(line => {
				if (line.startsWith('💡 ')) return `<div class="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg my-3"><span class="text-2xl">💡</span><span class="text-amber-800 flex-1">${line.slice(2)}</span></div>`;
				if (line.startsWith('📌 ')) return `<div class="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg my-3"><span class="text-2xl">📌</span><span class="text-red-800 flex-1">${line.slice(2)}</span></div>`;
				if (line.startsWith('ℹ️ ')) return `<div class="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg my-3"><span class="text-2xl">ℹ️</span><span class="text-blue-800 flex-1">${line.slice(3)}</span></div>`;
				if (line.startsWith('✅ ')) return `<div class="flex gap-3 p-4 bg-green-50 border border-green-200 rounded-lg my-3"><span class="text-2xl">✅</span><span class="text-green-800 flex-1">${line.slice(2)}</span></div>`;
				if (line.startsWith('⚠️ ')) return `<div class="flex gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg my-3"><span class="text-2xl">⚠️</span><span class="text-orange-800 flex-1">${line.slice(3)}</span></div>`;
				if (line.startsWith('🚀 ')) return `<div class="flex gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg my-3"><span class="text-2xl">🚀</span><span class="text-purple-800 flex-1">${line.slice(2)}</span></div>`;
				if (line.startsWith('### ')) return `<h3 class="text-lg font-semibold text-slate-800 mt-6 mb-3">${line.slice(4)}</h3>`;
				if (line.startsWith('## ')) return `<h2 class="text-xl font-semibold text-slate-800 mt-6 mb-3">${line.slice(3)}</h2>`;
				if (line.startsWith('# ')) return `<h1 class="text-2xl font-bold text-slate-900 mt-6 mb-3">${line.slice(2)}</h1>`;
				if (line.startsWith('• ')) return `<div class="flex gap-3 ml-4 my-1"><span class="text-slate-400">•</span><span>${line.slice(2)}</span></div>`;
				if (line.startsWith('☐ ')) return `<div class="flex gap-3 ml-4 my-1"><span class="text-slate-400 text-lg">☐</span><span>${line.slice(2)}</span></div>`;
				if (line.startsWith('☑ ')) return `<div class="flex gap-3 ml-4 my-1"><span class="text-green-600 text-lg">☑</span><span class="line-through text-slate-400">${line.slice(2)}</span></div>`;
				if (line.match(/^\d+\. /)) return `<div class="flex gap-3 ml-4 my-1"><span class="text-slate-500 font-medium">${line.match(/^\d+/)?.[0]}.</span><span>${line.replace(/^\d+\. /, '')}</span></div>`;
				if (line.startsWith('> ')) return `<blockquote class="border-l-4 border-slate-300 pl-4 py-2 text-slate-600 italic my-3 bg-slate-50 rounded-r-lg">${line.slice(2)}</blockquote>`;
				if (line === '---') return `<hr class="my-6 border-slate-200" />`;
				if (line === '') return `<div class="h-3"></div>`;
				return `<p class="my-2 text-slate-700 leading-relaxed">${line}</p>`;
			})
			.join('');
	}

	function extractYouTubeId(text: string): string | null {
		if (!text) return null;
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

	// Extract all URLs from text
	function extractUrls(text: string): { url: string; domain: string; isYoutube: boolean; youtubeId?: string }[] {
		if (!text) return [];
		const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
		const matches = text.match(urlPattern) || [];
		const seen = new Set<string>();
		return matches
			.filter(url => {
				if (seen.has(url)) return false;
				seen.add(url);
				return true;
			})
			.map(url => {
				try {
					const urlObj = new URL(url);
					const isYoutube = urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be');
					return {
						url,
						domain: urlObj.hostname.replace('www.', ''),
						isYoutube,
						youtubeId: isYoutube ? extractYouTubeId(url) || undefined : undefined
					};
				} catch {
					return { url, domain: url, isYoutube: false };
				}
			});
	}

	// Get domain icon/emoji based on common services
	function getDomainIcon(domain: string): string {
		if (domain.includes('youtube')) return '🎬';
		if (domain.includes('twitter') || domain.includes('x.com')) return '𝕏';
		if (domain.includes('instagram')) return '📸';
		if (domain.includes('facebook')) return '👤';
		if (domain.includes('github')) return '💻';
		if (domain.includes('figma')) return '🎨';
		if (domain.includes('notion')) return '📝';
		if (domain.includes('slack')) return '💬';
		if (domain.includes('drive.google') || domain.includes('docs.google')) return '📄';
		if (domain.includes('sheets.google')) return '📊';
		if (domain.includes('slides.google')) return '📽️';
		if (domain.includes('google')) return '🔍';
		if (domain.includes('amazon') || domain.includes('amzn')) return '📦';
		if (domain.includes('spotify')) return '🎵';
		if (domain.includes('netflix')) return '🎥';
		if (domain.includes('zoom')) return '📹';
		if (domain.includes('linkedin')) return '💼';
		if (domain.includes('tiktok')) return '🎵';
		if (domain.includes('pinterest')) return '📌';
		return '🔗';
	}

	let formattedContent = $derived(renderFormattedText(data.review.description || ''));
	let youtubeId = $derived(extractYouTubeId(data.review.description || ''));
	let extractedUrls = $derived(extractUrls(data.review.description || ''));

	// Edit mode state
	let isEditMode = $state(data.review.status === 'draft' && !data.review.description);
	let editTitle = $state(data.review.title);
	let editDescription = $state(data.review.description || '');
	let editEmoji = $state(data.review.emoji || '📄');
	let showEmojiPicker = $state(false);

	// Modal states
	let rejectReason = $state('');
	let sendNotification = $state(true);
	let showApproveModal = $state(false);
	let showDeleteModal = $state(false);

	// Emojis
	const emojis = [
		'📄', '📝', '📋', '📌', '📎', '🎯', '🎬', '🎥', '📺', '🎵',
		'💡', '⭐', '🔥', '✨', '💫', '🚀', '💪', '👍', '✅', '❌',
		'⚠️', '📢', '💬', '📊', '📈', '📉', '🗂️', '📁', '🔗', '🌐'
	];

	// Block templates
	const blockTemplates = [
		{ emoji: '💡', label: '黄色', bg: 'bg-amber-50', border: 'border-amber-200' },
		{ emoji: '📌', label: '赤', bg: 'bg-red-50', border: 'border-red-200' },
		{ emoji: 'ℹ️', label: '青', bg: 'bg-blue-50', border: 'border-blue-200' },
		{ emoji: '✅', label: '緑', bg: 'bg-green-50', border: 'border-green-200' },
		{ emoji: '⚠️', label: 'オレンジ', bg: 'bg-orange-50', border: 'border-orange-200' },
		{ emoji: '🚀', label: '紫', bg: 'bg-purple-50', border: 'border-purple-200' },
	];

	const headingTemplates = [
		{ icon: 'H1', label: '見出し1', insert: '# ' },
		{ icon: 'H2', label: '見出し2', insert: '## ' },
		{ icon: 'H3', label: '見出し3', insert: '### ' },
	];

	const listTemplates = [
		{ icon: '•', label: '箇条書き', insert: '• ' },
		{ icon: '☐', label: 'チェック', insert: '☐ ' },
		{ icon: '1.', label: '番号', insert: '1. ' },
		{ icon: '>', label: '引用', insert: '> ' },
	];

	function insertBlock(prefix: string) {
		const needsNewline = editDescription.length > 0 && !editDescription.endsWith('\n');
		editDescription = editDescription + (needsNewline ? '\n' : '') + prefix;
	}

	function insertDivider() {
		const needsNewline = editDescription.length > 0 && !editDescription.endsWith('\n');
		editDescription = editDescription + (needsNewline ? '\n' : '') + '---\n';
	}

	$effect(() => {
		editTitle = data.review.title;
		editDescription = data.review.description || '';
		editEmoji = data.review.emoji || '📄';
	});

	$effect(() => {
		if (form?.success && form?.action === 'rejected') {
			rejectReason = '';
		}
		if (form?.success && form?.action === 'updated') {
			isEditMode = false;
		}
	});

</script>

<AppLayout user={data.user}>
	<div class="max-w-3xl mx-auto px-4">
		<!-- Back link -->
		<div class="mb-4">
			<a href="/reviews" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
				チェック一覧に戻る
			</a>
		</div>

		{#if form?.success}
			<div class="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-xl">
				{#if form.action === 'approved'}
					確認OKを送信しました。
				{:else if form.action === 'rejected'}
					コメントを送信しました。
				{:else if form.action === 'updated'}
					保存しました。
				{/if}
			</div>
		{/if}

		{#if form?.error}
			<div class="mb-6 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
				{form.error}
			</div>
		{/if}

		<!-- Edit Mode (Notion-style) -->
		{#if isEditMode}
			<form method="POST" action="?/update" use:enhance class="min-h-[80vh]">
				<input type="hidden" name="emoji" value={editEmoji} />

				<!-- Floating Save Button -->
				<div class="fixed top-4 right-4 z-40 flex gap-2">
					<button type="button" onclick={() => isEditMode = false} class="px-4 py-2 text-sm text-slate-600 bg-white hover:bg-slate-100 rounded-lg shadow-lg border border-slate-200">キャンセル</button>
					<button type="submit" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg">保存</button>
				</div>

				<!-- Emoji Icon (hoverable) -->
				<div class="mb-4 relative">
					<button type="button" onclick={() => showEmojiPicker = !showEmojiPicker} class="w-16 h-16 hover:bg-slate-100 rounded-xl flex items-center justify-center text-5xl transition-colors cursor-pointer">
						{editEmoji}
					</button>
					{#if showEmojiPicker}
						<div class="absolute top-18 left-0 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-50 w-80">
							<div class="grid grid-cols-10 gap-1">
								{#each emojis as emoji}
									<button type="button" onclick={() => { editEmoji = emoji; showEmojiPicker = false; }} class="w-8 h-8 flex items-center justify-center text-xl hover:bg-slate-100 rounded transition-colors">
										{emoji}
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- Title (Notion-style: no border, large) -->
				<input type="text" name="title" bind:value={editTitle} placeholder="無題" required class="w-full text-4xl font-bold text-slate-900 bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-slate-300 mb-2" />

				<!-- Toolbar (subtle) -->
				<div class="flex flex-wrap gap-1 mb-4 py-2 border-b border-slate-100 opacity-60 hover:opacity-100 transition-opacity">
					{#each headingTemplates as tmpl}
						<button type="button" onclick={() => insertBlock(tmpl.insert)} class="px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded transition-colors">{tmpl.icon}</button>
					{/each}
					<span class="text-slate-200">|</span>
					{#each listTemplates as tmpl}
						<button type="button" onclick={() => insertBlock(tmpl.insert)} class="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded transition-colors">{tmpl.icon}</button>
					{/each}
					<span class="text-slate-200">|</span>
					{#each blockTemplates as tmpl}
						<button type="button" onclick={() => insertBlock(tmpl.emoji + ' ')} class="w-6 h-6 flex items-center justify-center text-sm hover:bg-slate-100 rounded transition-colors">{tmpl.emoji}</button>
					{/each}
					<span class="text-slate-200">|</span>
					<button type="button" onclick={insertDivider} class="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded transition-colors">─</button>
				</div>

				<!-- URL Link Cards Preview (Edit Mode) -->
				{#if extractUrls(editDescription).length > 0}
					{@const editUrls = extractUrls(editDescription)}
					<div class="mb-4 grid gap-3 {editUrls.length === 1 ? 'grid-cols-1 max-w-2xl' : editUrls.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}">
						{#each editUrls as linkInfo}
							{#if linkInfo.isYoutube && linkInfo.youtubeId}
								<!-- YouTube Embed Card -->
								<div class="rounded-xl overflow-hidden shadow-lg border border-slate-200 bg-black">
									<iframe
										width="100%"
										height="{editUrls.length === 1 ? '360' : '200'}"
										src="https://www.youtube.com/embed/{linkInfo.youtubeId}"
										title="YouTube video"
										frameborder="0"
										allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
										allowfullscreen
									></iframe>
									<a href={linkInfo.url} target="_blank" rel="noopener noreferrer" class="block px-4 py-3 bg-slate-900 hover:bg-slate-800 transition-colors">
										<div class="flex items-center gap-2">
											<span class="text-lg">🎬</span>
											<span class="text-sm text-slate-300 truncate flex-1">{linkInfo.domain}</span>
											<svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
											</svg>
										</div>
									</a>
								</div>
							{:else}
								<!-- Regular URL Card -->
								<a
									href={linkInfo.url}
									target="_blank"
									rel="noopener noreferrer"
									class="block rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white hover:shadow-lg hover:border-blue-300 transition-all group"
								>
									<div class="p-4">
										<div class="flex items-start gap-3">
											<div class="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
												{getDomainIcon(linkInfo.domain)}
											</div>
											<div class="flex-1 min-w-0">
												<p class="text-sm font-medium text-slate-900 mb-1 truncate">{linkInfo.domain}</p>
												<p class="text-xs text-slate-500 truncate">{linkInfo.url}</p>
											</div>
											<svg class="w-5 h-5 text-slate-300 group-hover:text-blue-500 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
											</svg>
										</div>
									</div>
								</a>
							{/if}
						{/each}
					</div>
				{/if}

				<!-- Content Editor (Notion-style: no visible border) -->
				<textarea name="description" bind:value={editDescription} placeholder="何か入力するか、AIに依頼するか、/でコマンド..." rows="30" class="w-full bg-transparent border-0 focus:outline-none focus:ring-0 resize-none text-base leading-relaxed text-slate-700 placeholder-slate-400"></textarea>
			</form>

		<!-- View Mode -->
		{:else}
			<div class="bg-white rounded-2xl shadow-xl border border-slate-200/50">
				<!-- Document Header -->
				<div class="px-6 sm:px-8 pt-6 sm:pt-8 pb-4">
					<div class="flex items-start justify-between gap-4">
						<div class="flex items-start gap-4">
							<div class="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-4xl shrink-0">
								{data.review.emoji || '📄'}
							</div>
							<div>
								<h1 class="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">{data.review.title}</h1>
								<div class="flex items-center gap-3 flex-wrap">
									<span class="px-3 py-1.5 text-sm font-medium rounded-full {statusColors[data.review.status]}">
										{statusLabels[data.review.status]}
									</span>
									<span class="text-sm text-slate-500">
										依頼者: {data.review.requester_name}
									</span>
								</div>
							</div>
						</div>
						<div class="flex items-center gap-2">
							{#if data.review.status === 'draft' || data.review.status === 'rejected'}
								<button type="button" onclick={() => isEditMode = true} class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="編集">
									<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
								</button>
							{/if}
							<button type="button" onclick={() => showDeleteModal = true} class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="削除">
								<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
							</button>
						</div>
					</div>
					<p class="text-sm text-slate-500 mt-4">
						作成日: {formatDate(data.review.created_at)}
						{#if data.review.due_date}
							<span class="mx-2">•</span>
							<span class="text-amber-600">期限: {formatDate(data.review.due_date)}</span>
						{/if}
					</p>
				</div>

				<!-- Public URL -->
				{#if data.review.public_token}
					<div class="mx-6 sm:mx-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
						<p class="text-sm font-medium text-blue-700 mb-2">共有URL（外部向け）</p>
						<div class="flex items-center gap-2">
							<input type="text" readonly value="{typeof window !== 'undefined' ? window.location.origin : ''}/p/{data.review.public_token}" class="flex-1 px-3 py-2 text-sm bg-white border border-blue-200 rounded-lg text-slate-600" />
							<button type="button" onclick={() => navigator.clipboard.writeText(`${window.location.origin}/p/${data.review.public_token}`)} class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">コピー</button>
						</div>
					</div>
				{/if}

				<!-- Divider -->
				<div class="mx-6 sm:mx-8 my-4 border-t border-slate-200"></div>

				<!-- Content -->
				<div class="px-6 sm:px-8 py-6">
					<!-- URL Link Cards -->
					{#if extractedUrls.length > 0}
						<div class="mb-6 grid gap-3 {extractedUrls.length === 1 ? 'grid-cols-1' : extractedUrls.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}">
							{#each extractedUrls as linkInfo}
								{#if linkInfo.isYoutube && linkInfo.youtubeId}
									<!-- YouTube Embed Card -->
									<div class="col-span-1 {extractedUrls.length === 1 ? 'sm:col-span-1' : ''} rounded-xl overflow-hidden shadow-lg border border-slate-200 bg-black">
										<iframe
											width="100%"
											height="{extractedUrls.length === 1 ? '360' : '200'}"
											src="https://www.youtube.com/embed/{linkInfo.youtubeId}"
											title="YouTube video"
											frameborder="0"
											allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
											allowfullscreen
										></iframe>
										<a href={linkInfo.url} target="_blank" rel="noopener noreferrer" class="block px-4 py-3 bg-slate-900 hover:bg-slate-800 transition-colors">
											<div class="flex items-center gap-2">
												<span class="text-lg">🎬</span>
												<span class="text-sm text-slate-300 truncate flex-1">{linkInfo.domain}</span>
												<svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
												</svg>
											</div>
										</a>
									</div>
								{:else}
									<!-- Regular URL Card -->
									<a
										href={linkInfo.url}
										target="_blank"
										rel="noopener noreferrer"
										class="block rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white hover:shadow-lg hover:border-blue-300 transition-all group"
									>
										<div class="p-4">
											<div class="flex items-start gap-3">
												<div class="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
													{getDomainIcon(linkInfo.domain)}
												</div>
												<div class="flex-1 min-w-0">
													<p class="text-sm font-medium text-slate-900 mb-1 truncate">{linkInfo.domain}</p>
													<p class="text-xs text-slate-500 truncate">{linkInfo.url}</p>
												</div>
												<svg class="w-5 h-5 text-slate-300 group-hover:text-blue-500 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
												</svg>
											</div>
										</div>
									</a>
								{/if}
							{/each}
						</div>
					{/if}

					{#if data.review.description}
						<div class="prose prose-slate max-w-none">
							{@html formattedContent}
						</div>
					{:else}
						<div class="text-center py-12">
							<p class="text-slate-400 italic mb-4">内容がありません</p>
							{#if data.review.status === 'draft'}
								<button type="button" onclick={() => isEditMode = true} class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
									内容を追加する
								</button>
							{/if}
						</div>
					{/if}
				</div>

				<!-- Action Section -->
				{#if data.review.status === 'pending' || data.review.status === 'shared' || data.review.status === 'draft'}
					<div class="px-6 sm:px-8 py-6 bg-slate-50 border-t border-slate-200 rounded-b-2xl">
						<p class="text-sm text-slate-600 mb-4">内容を確認して、コメントを入力するか確認OKを押してください。</p>

						<form method="POST" action="?/reject" use:enhance class="mb-4">
							<input type="hidden" name="sendNotification" value={sendNotification ? '1' : '0'} />
							<div class="bg-white border border-slate-300 rounded-xl p-4 shadow-inner mb-3">
								<textarea name="reason" rows="4" bind:value={rejectReason} placeholder="コメント・修正依頼を入力..." class="w-full bg-amber-50 px-4 py-3 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none text-slate-700"></textarea>
								<div class="flex items-center justify-between mt-3 flex-wrap gap-3">
									<label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
										<input type="checkbox" bind:checked={sendNotification} class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
										<svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
										メールで通知する
									</label>
									<button type="submit" disabled={!rejectReason.trim()} class="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
										<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
										差し戻し
									</button>
								</div>
							</div>
						</form>

						<button type="button" onclick={() => showApproveModal = true} class="w-full px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium flex items-center justify-center gap-2">
							<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
							確認OK
						</button>
					</div>
				{:else if data.review.status === 'approved'}
					<div class="px-6 sm:px-8 py-6 bg-emerald-50 border-t border-emerald-200 rounded-b-2xl text-center">
						<svg class="w-12 h-12 text-emerald-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
						<p class="text-emerald-700 font-medium">このドキュメントは確認OKされました</p>
					</div>
				{:else if data.review.status === 'rejected'}
					<div class="px-6 sm:px-8 py-6 bg-red-50 border-t border-red-200 rounded-b-2xl">
						<div class="text-center mb-4">
							<svg class="w-12 h-12 text-red-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
							<p class="text-red-700 font-medium">このドキュメントは差し戻しされました</p>
						</div>
						<div class="flex justify-center">
							<button type="button" onclick={() => isEditMode = true} class="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium flex items-center gap-2">
								<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
								修正して再依頼
							</button>
						</div>
					</div>
				{/if}
			</div>

			<!-- Activity Timeline -->
			{#if data.comments && data.comments.length > 0}
				<div class="mt-6 bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden">
					<div class="px-6 py-4 border-b border-slate-100">
						<h3 class="font-semibold text-slate-900 flex items-center gap-2">
							<svg class="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
							アクティビティ ({data.comments.length})
						</h3>
					</div>
					<div class="p-6">
						<div class="relative">
							<div class="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200"></div>
							<div class="space-y-6">
								{#each data.comments as comment}
									{@const isApproval = comment.content.includes('確認OK')}
									{@const isRejection = comment.content.includes('差し戻し') || comment.content.includes('コメント')}
									<div class="relative flex gap-4">
										<div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center z-10 {isApproval ? 'bg-emerald-100' : isRejection ? 'bg-red-100' : 'bg-slate-100'}">
											{#if isApproval}
												<svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
											{:else}
												<svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
											{/if}
										</div>
										<div class="flex-1 pb-2">
											<div class="rounded-xl p-4 {isApproval ? 'bg-emerald-50 border border-emerald-200' : isRejection ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-200'}">
												<p class="text-sm whitespace-pre-wrap {isApproval ? 'text-emerald-800' : isRejection ? 'text-red-800' : 'text-slate-700'}">{comment.content}</p>
											</div>
											<p class="text-xs text-slate-400 mt-2 ml-1">{formatDate(comment.created_at)}</p>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			{/if}
		{/if}
	</div>
</AppLayout>

<!-- Approve Modal -->
{#if showApproveModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onclick={() => showApproveModal = false}>
		<div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onclick={(e) => e.stopPropagation()}>
			<h3 class="text-xl font-bold text-slate-900 mb-4">確認OK</h3>
			<p class="text-slate-600 mb-4">このドキュメントを確認OKとして承認しますか？</p>
			<form method="POST" action="?/approve" use:enhance>
				<div class="flex gap-3">
					<button type="button" onclick={() => showApproveModal = false} class="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50">キャンセル</button>
					<button type="submit" class="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium">確認OK</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Delete Modal -->
{#if showDeleteModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onclick={() => showDeleteModal = false}>
		<div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onclick={(e) => e.stopPropagation()}>
			<h3 class="text-xl font-bold text-slate-900 mb-4">チェックを削除</h3>
			<p class="text-slate-600 mb-4">「{data.review.title}」を削除しますか？この操作は取り消せません。</p>
			<form method="POST" action="?/delete" use:enhance>
				<div class="flex gap-3">
					<button type="button" onclick={() => showDeleteModal = false} class="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50">キャンセル</button>
					<button type="submit" class="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium">削除する</button>
				</div>
			</form>
		</div>
	</div>
{/if}
