<script lang="ts">
	import '../../../app.css';
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let isSubmitting = $state(false);

	const statusLabels: Record<string, string> = {
		draft: '作成済',
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

	const actionTypeLabels: Record<string, string> = {
		approved: '確認OK',
		comment: 'コメント',
		rejected: '差し戻し',
		resubmitted: '再依頼'
	};

	const actionTypeColors: Record<string, string> = {
		approved: 'bg-emerald-100 text-emerald-700',
		comment: 'bg-amber-100 text-amber-700',
		rejected: 'bg-red-100 text-red-700',
		resubmitted: 'bg-blue-100 text-blue-700'
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

	function formatShortDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('ja-JP', {
			month: 'numeric',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getCommentName(comment: any): string {
		if (comment.guest_name) return comment.guest_name;
		if (comment.user_name) return comment.user_name;
		const match = comment.content?.match(/【(.+?)】/);
		return match ? match[1] : '確認者';
	}

	function getActionType(comment: any): string {
		if (comment.action_type) return comment.action_type;
		if (comment.content?.includes('確認OK')) return 'approved';
		if (comment.content?.includes('差し戻し')) return 'rejected';
		if (comment.content?.includes('再依頼')) return 'resubmitted';
		return 'comment';
	}

	function getCleanContent(comment: any): string {
		if (comment.action_type) return comment.content;
		return comment.content?.replace(/【.+?】(が確認OKしました|からのコメント:?\n?)/g, '').trim() || '';
	}

	function renderFormattedText(text: string, excludeUrls: boolean = false): string {
		if (!text) return '';
		const urlPattern = /^https?:\/\/[^\s]+$/;
		return text
			.split('\n')
			.filter(line => {
				if (excludeUrls && urlPattern.test(line.trim())) return false;
				return true;
			})
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

	let extractedUrls = $derived(extractUrls(data.review.description || ''));
	let formattedContent = $derived(renderFormattedText(data.review.description || '', extractedUrls.length > 0));
	let hasTextContent = $derived(formattedContent.replace(/<div class="h-3"><\/div>/g, '').trim().length > 0);

	let guestName = $state('');
	let rejectReason = $state('');
	let sendNotification = $state(false);
	let showEditModal = $state(false);
	let editTitle = $state(data.review.title);
	let editDescription = $state(data.review.description || '');

	$effect(() => {
		editTitle = data.review.title;
		editDescription = data.review.description || '';
	});

	$effect(() => {
		if (form?.success) {
			isSubmitting = false;
			if (form.action === 'rejected') {
				rejectReason = '';
			}
			if (form.action === 'approved') {
				guestName = '';
			}
		}
		if (form?.error) {
			isSubmitting = false;
		}
	});

	function handleSubmit() {
		isSubmitting = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			isSubmitting = false;
		};
	}
</script>

<svelte:head>
	<title>{data.review.title} - 確認依頼</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
	<header class="bg-white border-b border-slate-200">
		<div class="max-w-3xl mx-auto px-6 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
						<svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
					</div>
					<div>
						<p class="text-xs text-slate-400">確認依頼</p>
						<p class="text-sm text-slate-600">{data.review.requester_name} さんから</p>
					</div>
				</div>
				<span class="px-3 py-1.5 text-sm font-medium rounded-full {statusColors[data.review.status]}">
					{statusLabels[data.review.status]}
				</span>
			</div>
		</div>
	</header>

	<main class="max-w-3xl mx-auto px-6 py-8">
		{#if form?.success}
			<div class="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-xl">
				{#if form.action === 'approved'}
					確認OKを送信しました。依頼者に通知されます。
				{:else if form.action === 'rejected'}
					コメントを送信しました。
				{:else if form.action === 'resubmitted'}
					ドキュメントを修正し、再依頼しました。
				{/if}
			</div>
		{/if}

		{#if form?.error}
			<div class="mb-6 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
				{form.error}
			</div>
		{/if}

		<div class="bg-white rounded-2xl shadow-xl border border-slate-200/50">
			<div class="px-6 sm:px-8 pt-6 sm:pt-8 pb-4">
				<div class="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-4xl mb-4">
					{data.review.emoji || '📄'}
				</div>
				<h1 class="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">{data.review.title}</h1>
				<p class="text-sm text-slate-500">
					作成日: {formatDate(data.review.created_at)}
					{#if data.review.due_date}
						<span class="mx-2">•</span>
						<span class="text-amber-600">期限: {formatDate(data.review.due_date)}</span>
					{/if}
				</p>
			</div>

			{#if data.approvers && data.approvers.length > 0}
				<div class="mx-6 sm:mx-8 mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
					<div class="flex items-center gap-2 mb-3">
						<svg class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span class="text-sm font-medium text-emerald-700">確認済み ({data.approvers.length}人)</span>
					</div>
					<div class="flex flex-wrap gap-2">
						{#each data.approvers as approver}
							<span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-200 rounded-full text-sm">
								<span class="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
									{(approver.guest_name as string)?.charAt(0) || '?'}
								</span>
								<span class="text-emerald-800 font-medium">{approver.guest_name}</span>
								<span class="text-emerald-500 text-xs">{formatShortDate(approver.created_at as string)}</span>
							</span>
						{/each}
					</div>
				</div>
			{/if}

			{#if data.goals && data.goals.length > 0}
			<div class="mx-6 sm:mx-8 mt-4">
				<div class="flex items-center gap-2 mb-2">
					<svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
					</svg>
					<span class="text-sm font-medium text-slate-500">関連プロジェクト</span>
				</div>
				<div class="flex flex-wrap gap-2">
					{#each data.goals as goal}
						<a
							href="/goals/{goal.id}"
							class="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm hover:bg-slate-100 hover:border-slate-300 transition-colors"
						>
							<span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: {goal.color}"></span>
							<span class="text-slate-700 font-medium">{goal.title}</span>
						</a>
					{/each}
				</div>
			</div>
		{/if}

		<div class="mx-6 sm:mx-8 mt-4 border-t border-slate-200"></div>

			<div class="px-6 sm:px-8 py-6">
				{#if extractedUrls.length > 0}
					<div class="space-y-3">
						{#each extractedUrls as linkInfo}
							{#if linkInfo.isYoutube && linkInfo.youtubeId}
								<div class="rounded-xl overflow-hidden shadow-lg border border-slate-200 bg-black">
									<iframe
										width="100%"
										height="360"
										src="https://www.youtube.com/embed/{linkInfo.youtubeId}"
										title="YouTube video"
										frameborder="0"
										allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
										allowfullscreen
									></iframe>
									<a href={linkInfo.url} target="_blank" rel="noopener noreferrer" class="block px-4 py-2 bg-slate-900 hover:bg-slate-800 transition-colors">
										<div class="flex items-center gap-2">
											<span class="text-sm">🎬</span>
											<span class="text-xs text-slate-300 truncate flex-1">{linkInfo.domain}</span>
											<svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
											</svg>
										</div>
									</a>
								</div>
							{:else}
								<a
									href={linkInfo.url}
									target="_blank"
									rel="noopener noreferrer"
									class="block rounded-xl border border-slate-200 bg-white hover:shadow-md hover:border-blue-300 transition-all group"
								>
									<div class="p-4">
										<div class="flex items-center gap-3">
											<div class="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-2xl shrink-0">
												{getDomainIcon(linkInfo.domain)}
											</div>
											<div class="flex-1 min-w-0">
												<p class="text-base font-medium text-slate-900 truncate">{linkInfo.domain}</p>
												<p class="text-sm text-slate-400 truncate">{linkInfo.url.replace(/^https?:\/\//, '').slice(0, 60)}...</p>
											</div>
											<svg class="w-5 h-5 text-slate-300 group-hover:text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
											</svg>
										</div>
									</div>
								</a>
							{/if}
						{/each}
					</div>
				{/if}

				{#if hasTextContent}
					<div class="prose prose-slate max-w-none {extractedUrls.length > 0 ? 'mt-6 pt-6 border-t border-slate-100' : ''}">
						{@html formattedContent}
					</div>
				{:else if extractedUrls.length === 0}
					<p class="text-slate-400 italic">内容がありません</p>
				{/if}
			</div>

			{#if data.review.status === 'pending' || data.review.status === 'shared' || data.review.status === 'rejected'}
				<div class="px-6 sm:px-8 py-6 bg-slate-50 border-t border-slate-200 rounded-b-2xl">
					<h3 class="text-sm font-semibold text-slate-700 mb-4">あなたの確認</h3>

					<div class="mb-4">
						<label for="guestNameInput" class="block text-sm font-medium text-slate-600 mb-1">
							お名前 <span class="text-red-500">*</span>
						</label>
						<input
							type="text"
							id="guestNameInput"
							bind:value={guestName}
							placeholder="山田 太郎"
							disabled={isSubmitting}
							class="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
						/>
					</div>

					<form method="POST" action="?/reject" use:enhance={handleSubmit} class="mb-4">
						<input type="hidden" name="guestName" value={guestName} />
						<input type="hidden" name="sendNotification" value={sendNotification ? '1' : '0'} />
						<div class="bg-white border border-slate-200 rounded-xl p-4">
							<label for="commentInput" class="block text-sm font-medium text-slate-600 mb-1">
								コメント（任意）
							</label>
							<textarea
								id="commentInput"
								name="reason"
								rows="4"
								bind:value={rejectReason}
								disabled={isSubmitting}
								placeholder="コメント・修正依頼を入力..."
								class="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-none text-slate-700 disabled:opacity-50"
							></textarea>
							<div class="flex items-center justify-between mt-3 flex-wrap gap-3">
								<label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
									<input
										type="checkbox"
										bind:checked={sendNotification}
										class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
									/>
									<svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
									</svg>
									メールで通知
								</label>
								<button
									type="submit"
									disabled={!rejectReason.trim() || !guestName.trim() || isSubmitting}
									class="px-5 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
								>
									{#if isSubmitting}
										<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
										送信中...
									{:else}
										<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
										</svg>
										コメント送信
									{/if}
								</button>
							</div>
						</div>
					</form>

					<form method="POST" action="?/approve" use:enhance={handleSubmit}>
						<input type="hidden" name="guestName" value={guestName} />
						<button
							type="submit"
							disabled={!guestName.trim() || isSubmitting}
							class="w-full px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{#if isSubmitting}
								<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
								送信中...
							{:else}
								<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
								確認OK
							{/if}
						</button>
					</form>
				</div>
			{:else if data.review.status === 'approved'}
				<div class="px-6 sm:px-8 py-6 bg-emerald-50 border-t border-emerald-200 rounded-b-2xl">
					<div class="text-center mb-4">
						<svg class="w-8 h-8 text-emerald-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<p class="text-emerald-700 font-medium">このドキュメントは確認OKされました</p>
					</div>
					<div class="border-t border-emerald-200 pt-4 mt-4">
						<p class="text-sm text-emerald-700 mb-3">追加で確認する場合</p>
						<div class="mb-3">
							<input
								type="text"
								bind:value={guestName}
								placeholder="お名前"
								disabled={isSubmitting}
								class="w-full px-4 py-2.5 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white disabled:opacity-50"
							/>
						</div>
						<form method="POST" action="?/approve" use:enhance={handleSubmit}>
							<input type="hidden" name="guestName" value={guestName} />
							<button
								type="submit"
								disabled={!guestName.trim() || isSubmitting}
								class="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
							>
								{#if isSubmitting}
									<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
									送信中...
								{:else}
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
									</svg>
									確認OK
								{/if}
							</button>
						</form>
					</div>
				</div>
			{/if}
		</div>

		{#if data.comments && data.comments.length > 0}
			<div class="mt-6 bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden">
				<div class="px-6 py-4 border-b border-slate-100">
					<h3 class="font-semibold text-slate-900 flex items-center gap-2">
						<svg class="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						アクティビティ ({data.comments.length})
					</h3>
				</div>
				<div class="p-6">
					<div class="relative">
						<div class="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200"></div>
						<div class="space-y-4">
							{#each data.comments as comment}
								{@const actionType = getActionType(comment)}
								{@const displayName = getCommentName(comment)}
								{@const cleanContent = getCleanContent(comment)}
								<div class="relative flex gap-4">
									<div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center z-10 text-white text-xs font-bold {actionType === 'approved' ? 'bg-emerald-500' : actionType === 'comment' || actionType === 'rejected' ? 'bg-amber-500' : 'bg-blue-500'}">
										{displayName.charAt(0)}
									</div>
									<div class="flex-1 pb-2">
										<div class="flex items-center gap-2 mb-2 flex-wrap">
											<span class="inline-flex items-center px-2.5 py-1 bg-slate-100 rounded-full text-sm font-medium text-slate-800">
												{displayName}
											</span>
											<span class="px-2 py-0.5 text-xs font-medium rounded-full {actionTypeColors[actionType]}">
												{actionTypeLabels[actionType] || actionType}
											</span>
											<span class="text-xs text-slate-400">{formatShortDate(comment.created_at as string)}</span>
										</div>
										{#if cleanContent && actionType !== 'approved'}
											<div class="rounded-lg p-3 bg-slate-50 border border-slate-200">
												<p class="text-sm whitespace-pre-wrap text-slate-700">{cleanContent}</p>
											</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>

				<!-- 確認済み一覧 (アクティビティの下) -->
				{#if data.approvers && data.approvers.length > 0}
				<div class="px-6 py-4 bg-emerald-50 border-t border-emerald-100">
					<div class="flex items-center gap-3 mb-3">
						<div class="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
							<svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
							</svg>
						</div>
						<span class="text-base font-semibold text-emerald-800">確認済み</span>
						<span class="text-sm text-emerald-600">({data.approvers.length}人)</span>
					</div>
					<div class="flex flex-wrap gap-2">
						{#each data.approvers as approver}
							<div class="inline-flex items-center gap-2 px-4 py-2 bg-white border border-emerald-200 rounded-xl shadow-sm">
								<svg class="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
								</svg>
								<span class="font-medium text-emerald-900">{approver.guest_name}</span>
								<span class="text-xs text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">確認済</span>
							</div>
						{/each}
					</div>
				</div>
				{/if}
			</div>
		{/if}
	</main>
</div>

{#if showEditModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onclick={() => showEditModal = false}>
		<div class="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6" onclick={(e) => e.stopPropagation()}>
			<h3 class="text-xl font-bold text-slate-900 mb-4">ドキュメントを修正</h3>
			<form method="POST" action="?/resubmit" use:enhance={handleSubmit}>
				<div class="space-y-4">
					<div>
						<label for="editTitle" class="block text-sm font-medium text-slate-700 mb-1">タイトル <span class="text-red-500">*</span></label>
						<input type="text" id="editTitle" name="title" required bind:value={editTitle} class="w-full px-4 py-2 border border-slate-200 rounded-xl" />
					</div>
					<div>
						<label for="editDescription" class="block text-sm font-medium text-slate-700 mb-1">内容</label>
						<textarea id="editDescription" name="description" rows="6" bind:value={editDescription} class="w-full px-4 py-2 border border-slate-200 rounded-xl resize-none" placeholder="ドキュメントの内容を記載してください"></textarea>
					</div>
				</div>
				<div class="flex gap-3 mt-6">
					<button type="button" onclick={() => showEditModal = false} class="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50">
						キャンセル
					</button>
					<button type="submit" disabled={isSubmitting} class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium disabled:opacity-50">
						{isSubmitting ? '送信中...' : '保存して再依頼'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
