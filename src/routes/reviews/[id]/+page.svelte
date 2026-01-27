<script lang="ts">
	import AppLayout from '$lib/components/AppLayout.svelte';
	import GoalBlock from '$lib/components/GoalBlock.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const statusLabels: Record<string, string> = {
		draft: '未通知',
		pending: '依頼中',
		in_review: '確認中',
		approved: '承認済',
		rejected: '差し戻し'
	};

	const statusColors: Record<string, string> = {
		draft: 'bg-slate-100 text-slate-600 ring-slate-400/20',
		pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
		in_review: 'bg-blue-50 text-blue-700 ring-blue-600/20',
		approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
		rejected: 'bg-red-50 text-red-700 ring-red-600/20'
	};

	const assigneeStatusLabels: Record<string, string> = {
		pending: '未確認',
		approved: '承認',
		rejected: '差し戻し'
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

	// URL type detection
	type UrlType = 'youtube' | 'vimeo' | 'video' | 'image' | 'figma' | 'iframe';

	function detectUrlType(url: string): UrlType {
		const lowerUrl = url.toLowerCase();
		if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube';
		if (lowerUrl.includes('vimeo.com')) return 'vimeo';
		if (/\.(mp4|webm|ogg|mov|avi|mkv)(\?|$)/i.test(url)) return 'video';
		if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(url)) return 'image';
		if (lowerUrl.includes('figma.com')) return 'figma';
		return 'iframe';
	}

	function getYouTubeEmbedUrl(url: string): string {
		let videoId = '';
		const watchMatch = url.match(/[?&]v=([^&]+)/);
		if (watchMatch) videoId = watchMatch[1];
		const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
		if (shortMatch) videoId = shortMatch[1];
		const embedMatch = url.match(/youtube\.com\/embed\/([^?&]+)/);
		if (embedMatch) videoId = embedMatch[1];
		return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
	}

	function getVimeoEmbedUrl(url: string): string {
		const match = url.match(/vimeo\.com\/(\d+)/);
		return match ? `https://player.vimeo.com/video/${match[1]}` : url;
	}

	function getUrlTypeLabel(type: UrlType): { label: string; color: string } {
		const labels: Record<UrlType, { label: string; color: string }> = {
			youtube: { label: 'YouTube', color: 'bg-red-100 text-red-700' },
			vimeo: { label: 'Vimeo', color: 'bg-blue-100 text-blue-700' },
			video: { label: '動画', color: 'bg-purple-100 text-purple-700' },
			image: { label: '画像', color: 'bg-green-100 text-green-700' },
			figma: { label: 'Figma', color: 'bg-violet-100 text-violet-700' },
			iframe: { label: 'Web', color: 'bg-slate-100 text-slate-700' }
		};
		return labels[type];
	}

	// Parse multiple URLs
	const urls = data.review.target_url.split('\n').filter((url: string) => url.trim());
	let activeUrlIndex = $state(0);
	let currentUrl = $derived(urls[activeUrlIndex]);
	let urlType = $derived(detectUrlType(currentUrl));

	// Preview mode: desktop or mobile
	type PreviewMode = 'desktop' | 'mobile';
	let previewMode = $state<PreviewMode>('desktop');

	// Build comment tree
	function buildCommentTree(comments: typeof data.comments) {
		const map = new Map();
		const roots: typeof data.comments = [];
		for (const comment of comments) {
			map.set(comment.id, { ...comment, replies: [] });
		}
		for (const comment of comments) {
			const node = map.get(comment.id);
			if (comment.parent_id) {
				const parent = map.get(comment.parent_id);
				if (parent) parent.replies.push(node);
				else roots.push(node);
			} else {
				roots.push(node);
			}
		}
		return roots;
	}

	const commentTree = buildCommentTree(data.comments);
	let replyingTo: string | null = $state(null);
	let commentText = $state('');
	let urlCopied = $state(false);

	function copyPublicUrl() {
		if (data.publicUrl) {
			const fullUrl = window.location.origin + data.publicUrl;
			navigator.clipboard.writeText(fullUrl).then(() => {
				urlCopied = true;
				setTimeout(() => urlCopied = false, 2000);
			});
		}
	}
</script>

<AppLayout user={data.user}>
	<div class="max-w-[1800px] mx-auto">
		<!-- Header -->
		<div class="mb-6">
			<a href="/reviews" class="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm mb-3">
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				一覧に戻る
			</a>
			<div class="flex flex-wrap items-center gap-3 mb-2">
				<h1 class="text-2xl font-bold text-slate-900">{data.review.title}</h1>
				<span class="px-2.5 py-1 text-xs font-medium rounded-full ring-1 ring-inset {statusColors[data.review.status]}">
					{statusLabels[data.review.status]}
				</span>
				{#if data.review.status === 'draft' && data.isRequester}
					<form method="POST" action="?/sendNotifications" class="inline">
						<button
							type="submit"
							class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 transition-colors"
						>
							<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
							</svg>
							チェック依頼を送る
						</button>
					</form>
				{/if}
			</div>
			<p class="text-sm text-slate-500">
				{data.review.requester_name} さんが {formatDate(data.review.created_at)} に依頼
			</p>
		</div>

		<div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
			<!-- Left: Preview Panel -->
			<div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
				<div class="px-6 py-4 border-b border-slate-100">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<h2 class="text-lg font-semibold text-slate-900">プレビュー</h2>
							{#if urls.length > 1}
								<span class="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">{urls.length}件</span>
							{/if}
						</div>

						<!-- Device Toggle -->
						<div class="flex items-center gap-2">
							<div class="flex bg-slate-100 rounded-lg p-1">
								<button
									type="button"
									onclick={() => previewMode = 'desktop'}
									class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 {previewMode === 'desktop' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}"
								>
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
									</svg>
									PC
								</button>
								<button
									type="button"
									onclick={() => previewMode = 'mobile'}
									class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 {previewMode === 'mobile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}"
								>
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
									</svg>
									スマホ
								</button>
							</div>
							<a
								href={urls[activeUrlIndex]}
								target="_blank"
								rel="noopener noreferrer"
								class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
								title="新しいタブで開く"
							>
								<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
								</svg>
							</a>
						</div>
					</div>

					<!-- URL Tabs -->
					{#if urls.length > 1}
						<div class="flex gap-2 mt-4 overflow-x-auto pb-1">
							{#each urls as url, index}
								{@const urlType = detectUrlType(url)}
								{@const typeInfo = getUrlTypeLabel(urlType)}
								<button
									type="button"
									onclick={() => activeUrlIndex = index}
									class="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors {activeUrlIndex === index ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
								>
									<span class="flex items-center gap-1.5">
										<span class="w-5 h-5 rounded text-xs flex items-center justify-center {activeUrlIndex === index ? 'bg-white/20' : typeInfo.color}">{index + 1}</span>
										{typeInfo.label}
									</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Preview Container -->
				<div class="p-4 bg-slate-50 min-h-[600px] flex items-start justify-center">

					<div
						class="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 {previewMode === 'mobile' ? 'w-[375px]' : 'w-full'}"
						style={previewMode === 'mobile' ? 'max-width: 375px;' : ''}
					>
						<!-- Device Frame for Mobile -->
						{#if previewMode === 'mobile'}
							<div class="bg-slate-800 px-4 py-2 flex items-center justify-center">
								<div class="w-20 h-1 bg-slate-600 rounded-full"></div>
							</div>
						{/if}

						<div class="bg-slate-100 border border-slate-200 {previewMode === 'mobile' ? 'rounded-b-xl' : 'rounded-xl'}">
							{#if urlType === 'youtube'}
								<div class="aspect-video">
									<iframe
										src={getYouTubeEmbedUrl(currentUrl)}
										title="YouTube video"
										class="w-full h-full"
										frameborder="0"
										allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
										allowfullscreen
									></iframe>
								</div>
							{:else if urlType === 'vimeo'}
								<div class="aspect-video">
									<iframe
										src={getVimeoEmbedUrl(currentUrl)}
										title="Vimeo video"
										class="w-full h-full"
										frameborder="0"
										allow="autoplay; fullscreen; picture-in-picture"
										allowfullscreen
									></iframe>
								</div>
							{:else if urlType === 'video'}
								<div class="aspect-video bg-black">
									<video src={currentUrl} controls class="w-full h-full">
										<track kind="captions" />
									</video>
								</div>
							{:else if urlType === 'image'}
								<div class="flex items-center justify-center p-4 min-h-[400px]">
									<img src={currentUrl} alt="Preview" class="max-w-full max-h-[500px] object-contain" />
								</div>
							{:else if urlType === 'figma'}
								<div class="{previewMode === 'mobile' ? 'h-[600px]' : 'h-[700px]'}">
									<iframe
										src={currentUrl.replace('figma.com/file', 'figma.com/embed').replace('figma.com/design', 'figma.com/embed')}
										title="Figma"
										class="w-full h-full"
										allowfullscreen
									></iframe>
								</div>
							{:else}
								<iframe
									src={currentUrl}
									title="Preview"
									class="w-full {previewMode === 'mobile' ? 'h-[600px]' : 'h-[700px]'}"
									sandbox="allow-scripts allow-same-origin"
								></iframe>
							{/if}
						</div>

						{#if previewMode === 'mobile'}
							<div class="bg-slate-800 px-4 py-3 flex items-center justify-center">
								<div class="w-10 h-10 rounded-full border-2 border-slate-600"></div>
							</div>
						{/if}
					</div>
				</div>

				<div class="px-4 py-3 border-t border-slate-100 bg-white">
					<div class="flex items-center gap-2">
						<span class="px-2 py-0.5 text-xs font-medium rounded {typeInfo.color}">{typeInfo.label}</span>
						<p class="text-xs text-slate-400 break-all flex-1 truncate">{currentUrl}</p>
					</div>
				</div>
			</div>

			<!-- Right: Info & Actions -->
			<div class="space-y-6">
				<!-- Review Actions -->
				{#if data.isAssignee && data.myAssignment?.status === 'pending'}
					<div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
						<h2 class="text-lg font-semibold mb-4">確認アクション</h2>
						<p class="text-blue-100 text-sm mb-4">このレビューの確認をお願いします</p>
						<div class="flex gap-3">
							<form method="POST" action="?/approve" class="flex-1">
								<button type="submit" class="w-full px-4 py-3 bg-white text-emerald-600 rounded-xl hover:bg-emerald-50 font-semibold transition-colors flex items-center justify-center gap-2">
									<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
									</svg>
									確認OK
								</button>
							</form>
							<form method="POST" action="?/reject" class="flex-1">
								<button type="submit" class="w-full px-4 py-3 bg-white/20 text-white rounded-xl hover:bg-white/30 font-semibold transition-colors flex items-center justify-center gap-2">
									<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
									</svg>
									差し戻し
								</button>
							</form>
						</div>
					</div>
				{/if}

				<!-- Public URL Share -->
				{#if data.publicUrl && data.isRequester}
					<div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
						<div class="px-6 py-4 border-b border-slate-100">
							<h2 class="text-lg font-semibold text-slate-900 flex items-center gap-2">
								<svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
								</svg>
								外部共有URL
							</h2>
						</div>
						<div class="p-6">
							<p class="text-sm text-slate-600 mb-3">
								このURLを共有すると、ログインなしでレビュー・確認ができます。
							</p>
							<div class="flex gap-2">
								<input
									type="text"
									readonly
									value={typeof window !== 'undefined' ? window.location.origin + data.publicUrl : data.publicUrl}
									class="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 font-mono"
								/>
								<button
									type="button"
									onclick={copyPublicUrl}
									class="px-4 py-2.5 rounded-xl font-medium transition-all {urlCopied ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'} flex items-center gap-2"
								>
									{#if urlCopied}
										<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
										</svg>
										コピー済
									{:else}
										<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
										</svg>
										コピー
									{/if}
								</button>
							</div>
						</div>
					</div>
				{/if}

				<!-- Related Goals -->
				{#if data.goals && data.goals.length > 0}
					<div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
						<div class="px-6 py-4 border-b border-slate-100">
							<h2 class="text-lg font-semibold text-slate-900 flex items-center gap-2">
								<svg class="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
								</svg>
								関連プロジェクト
							</h2>
						</div>
						<div class="p-4 space-y-3">
							{#each data.goals as goal}
								<GoalBlock {goal} />
							{/each}
						</div>
					</div>
				{/if}

				<!-- Description -->
				{#if data.review.description}
					<div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
						<div class="px-6 py-4 border-b border-slate-100">
							<h2 class="text-lg font-semibold text-slate-900">説明・依頼内容</h2>
						</div>
						<div class="p-6">
							<p class="text-slate-700 whitespace-pre-wrap">{data.review.description}</p>
						</div>
					</div>
				{/if}

				<!-- Info & Assignees -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
						<div class="px-5 py-3 border-b border-slate-100">
							<h3 class="font-semibold text-slate-900">詳細情報</h3>
						</div>
						<dl class="divide-y divide-slate-100 text-sm">
							<div class="px-5 py-3 flex justify-between">
								<dt class="text-slate-500">依頼者</dt>
								<dd class="font-medium text-slate-900">{data.review.requester_name}</dd>
							</div>
							{#if data.tags && data.tags.length > 0}
								<div class="px-5 py-3">
									<dt class="text-slate-500 mb-2">タグ</dt>
									<dd class="flex flex-wrap gap-1.5">
										{#each data.tags as tag}
											<span
												class="px-3 py-1 text-xs font-bold rounded-full shadow-sm"
												style="background-color: {tag.color}; color: white"
											>
												{tag.name}
											</span>
										{/each}
									</dd>
								</div>
							{/if}
							<div class="px-5 py-3 flex justify-between">
								<dt class="text-slate-500">URL数</dt>
								<dd class="font-medium text-slate-900">{urls.length}件</dd>
							</div>
							{#if data.review.due_date}
								<div class="px-5 py-3 flex justify-between">
									<dt class="text-slate-500">期限</dt>
									<dd class="font-medium text-slate-900">{formatDate(data.review.due_date)}</dd>
								</div>
							{/if}
						</dl>
					</div>

					<div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
						<div class="px-5 py-3 border-b border-slate-100">
							<h3 class="font-semibold text-slate-900">レビュワー</h3>
						</div>
						<ul class="divide-y divide-slate-100">
							{#each data.assignees as assignee}
								<li class="px-5 py-3 flex items-center justify-between">
									<div class="flex items-center gap-2">
										<div class="w-7 h-7 bg-gradient-to-br {assignee.status === 'approved' ? 'from-emerald-400 to-emerald-600' : assignee.status === 'rejected' ? 'from-red-400 to-red-600' : 'from-slate-400 to-slate-600'} rounded-full flex items-center justify-center text-white font-semibold text-xs">
											{assignee.name.charAt(0)}
										</div>
										<span class="text-sm font-medium text-slate-900">{assignee.name}</span>
									</div>
									<span class="px-2 py-0.5 text-xs font-medium rounded-full {assignee.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : assignee.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}">
										{assigneeStatusLabels[assignee.status]}
									</span>
								</li>
							{/each}
						</ul>
					</div>
				</div>

				<!-- Comments -->
				<div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
					<div class="px-6 py-4 border-b border-slate-100">
						<h2 class="text-lg font-semibold text-slate-900">
							コメント <span class="text-slate-400 font-normal">({data.comments.length})</span>
						</h2>
					</div>
					<div class="p-6">
						{#if form?.error}
							<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">{form.error}</div>
						{/if}

						<form method="POST" action="?/comment" class="mb-6">
							<input type="hidden" name="parentId" value="" />
							<textarea
								name="content"
								rows="3"
								placeholder="コメントを入力..."
								class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
								bind:value={commentText}
							></textarea>
							<div class="mt-3 flex justify-end">
								<button type="submit" class="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
									投稿
								</button>
							</div>
						</form>

						<div class="space-y-4 max-h-[400px] overflow-y-auto">
							{#each commentTree as comment}
								<div class="bg-slate-50 rounded-xl p-4">
									<div class="flex items-start gap-3">
										<div class="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0">
											{comment.user_name.charAt(0)}
										</div>
										<div class="flex-1 min-w-0">
											<div class="flex items-center gap-2 mb-1">
												<span class="font-medium text-slate-900 text-sm">{comment.user_name}</span>
												<span class="text-xs text-slate-400">{formatDate(comment.created_at)}</span>
											</div>
											<p class="text-slate-700 text-sm whitespace-pre-wrap">{comment.content}</p>
											<button
												type="button"
												class="mt-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
												onclick={() => replyingTo = replyingTo === comment.id ? null : comment.id}
											>
												返信
											</button>
										</div>
									</div>

									{#if replyingTo === comment.id}
										<form method="POST" action="?/comment" class="mt-3 ml-11">
											<input type="hidden" name="parentId" value={comment.id} />
											<textarea name="content" rows="2" placeholder="返信..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"></textarea>
											<div class="mt-2 flex justify-end gap-2">
												<button type="button" class="px-3 py-1 text-xs text-slate-500" onclick={() => replyingTo = null}>キャンセル</button>
												<button type="submit" class="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg">返信</button>
											</div>
										</form>
									{/if}

									{#if comment.replies?.length > 0}
										<div class="mt-3 ml-11 space-y-2">
											{#each comment.replies as reply}
												<div class="bg-white rounded-lg p-3 border border-slate-200">
													<div class="flex items-center gap-2 mb-1">
														<div class="w-6 h-6 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white text-xs">{reply.user_name.charAt(0)}</div>
														<span class="font-medium text-slate-900 text-xs">{reply.user_name}</span>
														<span class="text-xs text-slate-400">{formatDate(reply.created_at)}</span>
													</div>
													<p class="text-slate-700 text-xs whitespace-pre-wrap ml-8">{reply.content}</p>
												</div>
											{/each}
										</div>
									{/if}
								</div>
							{:else}
								<div class="text-center py-6 text-slate-400 text-sm">コメントはまだありません</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</AppLayout>
