<script lang="ts">
	import '../../../app.css';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const statusLabels: Record<string, string> = {
		pending: '確認待ち',
		in_review: '確認中',
		approved: '確認OK',
		rejected: '差し戻し'
	};

	const statusColors: Record<string, string> = {
		pending: 'bg-amber-50 text-amber-700 border-amber-200',
		in_review: 'bg-blue-50 text-blue-700 border-blue-200',
		approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
		rejected: 'bg-red-50 text-red-700 border-red-200'
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
		return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
	}

	function getVimeoEmbedUrl(url: string): string {
		const match = url.match(/vimeo\.com\/(\d+)/);
		return match ? `https://player.vimeo.com/video/${match[1]}` : url;
	}

	// Parse multiple URLs
	const urls = data.review.target_url.split('\n').filter((url: string) => url.trim());
	let activeUrlIndex = $state(0);
	let currentUrl = $derived(urls[activeUrlIndex]);
	let urlType = $derived(detectUrlType(currentUrl));

	// Preview mode
	type PreviewMode = 'desktop' | 'mobile';
	let previewMode = $state<PreviewMode>('desktop');

	// Guest info
	let guestName = $state('');
	let guestEmail = $state('');
	let rejectReason = $state('');

	// Modal state
	let showApproveModal = $state(false);
	let showRejectModal = $state(false);

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
</script>

<svelte:head>
	<title>{data.review.title} - レビュー確認</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
	<!-- Header - Notion style -->
	<header class="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-50">
		<div class="max-w-5xl mx-auto px-6 py-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
						<svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
					</div>
					<div>
						<p class="text-xs text-slate-400 font-medium">共有ドキュメント</p>
						<p class="text-sm text-slate-600">{data.review.requester_name} さんからの依頼</p>
					</div>
				</div>
				<span class="px-3 py-1.5 text-sm font-medium rounded-full border {statusColors[data.review.status]}">
					{statusLabels[data.review.status]}
				</span>
			</div>
		</div>
	</header>

	<main class="max-w-5xl mx-auto px-6 py-8">
		{#if form?.success}
			<div class="mb-8 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-2xl flex items-center gap-4 shadow-sm">
				<div class="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
					<svg class="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<div>
					<p class="font-semibold text-lg">
						{#if form.action === 'approved'}
							確認OKを送信しました
						{:else}
							差し戻しを送信しました
						{/if}
					</p>
					<p class="text-sm text-emerald-600">依頼者にメールで通知されました</p>
				</div>
			</div>
		{/if}

		<!-- Document Title Section - Notion style -->
		<div class="mb-8">
			<!-- Tags -->
			{#if data.tags && data.tags.length > 0}
				<div class="flex flex-wrap gap-2 mb-4">
					{#each data.tags as tag}
						<span
							class="px-3 py-1 text-sm font-bold rounded-full shadow-sm"
							style="background-color: {tag.color}; color: white"
						>
							{tag.name}
						</span>
					{/each}
				</div>
			{/if}

			<h1 class="text-4xl font-bold text-slate-900 mb-3">{data.review.title}</h1>

			<div class="flex flex-wrap items-center gap-4 text-sm text-slate-500">
				<div class="flex items-center gap-2">
					<div class="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
						{data.review.requester_name.charAt(0)}
					</div>
					<span>{data.review.requester_name}</span>
				</div>
				<span class="text-slate-300">•</span>
				<span>{formatDate(data.review.created_at)}</span>
				{#if data.review.due_date}
					<span class="text-slate-300">•</span>
					<span class="text-amber-600">期限: {formatDate(data.review.due_date)}</span>
				{/if}
			</div>
		</div>

		<!-- Description Block - Notion style -->
		{#if data.review.description}
			<div class="mb-8 p-6 bg-slate-50 rounded-2xl border-l-4 border-blue-400">
				<h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">依頼内容</h2>
				<p class="text-slate-700 whitespace-pre-wrap leading-relaxed">{data.review.description}</p>
			</div>
		{/if}

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			<!-- Preview Panel - Document style -->
			<div class="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden">
				<div class="px-6 py-4 border-b border-slate-100">
					<div class="flex items-center justify-between flex-wrap gap-3">
						<div class="flex items-center gap-3">
							<h2 class="text-lg font-semibold text-slate-900">プレビュー</h2>
							{#if urls.length > 1}
								<span class="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">{urls.length}件</span>
							{/if}
						</div>

						<div class="flex items-center gap-2">
							<div class="flex bg-slate-100 rounded-lg p-1">
								<button
									type="button"
									onclick={() => previewMode = 'desktop'}
									class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 {previewMode === 'desktop' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}"
								>
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
									</svg>
									PC
								</button>
								<button
									type="button"
									onclick={() => previewMode = 'mobile'}
									class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 {previewMode === 'mobile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}"
								>
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
									</svg>
									スマホ
								</button>
							</div>
							<a href={urls[activeUrlIndex]} target="_blank" rel="noopener noreferrer" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
								<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
								</svg>
							</a>
						</div>
					</div>

					{#if urls.length > 1}
						<div class="flex gap-2 mt-4 overflow-x-auto pb-1">
							{#each urls as _, index}
								<button
									type="button"
									onclick={() => activeUrlIndex = index}
									class="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors {activeUrlIndex === index ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
								>
									URL {index + 1}
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<div class="p-4 bg-slate-50 min-h-[500px] flex items-start justify-center">

					<div class="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 {previewMode === 'mobile' ? 'w-[375px]' : 'w-full'}">
						{#if previewMode === 'mobile'}
							<div class="bg-slate-800 px-4 py-2 flex items-center justify-center">
								<div class="w-20 h-1 bg-slate-600 rounded-full"></div>
							</div>
						{/if}

						<div class="bg-slate-100 border border-slate-200">
							{#if urlType === 'youtube'}
								<div class="aspect-video">
									<iframe src={getYouTubeEmbedUrl(currentUrl)} title="YouTube" class="w-full h-full" frameborder="0" allowfullscreen></iframe>
								</div>
							{:else if urlType === 'vimeo'}
								<div class="aspect-video">
									<iframe src={getVimeoEmbedUrl(currentUrl)} title="Vimeo" class="w-full h-full" frameborder="0" allowfullscreen></iframe>
								</div>
							{:else if urlType === 'video'}
								<div class="aspect-video bg-black">
									<video src={currentUrl} controls class="w-full h-full"><track kind="captions" /></video>
								</div>
							{:else if urlType === 'image'}
								<div class="flex items-center justify-center p-4 min-h-[300px]">
									<img src={currentUrl} alt="Preview" class="max-w-full max-h-[400px] object-contain" />
								</div>
							{:else}
								<iframe src={currentUrl} title="Preview" class="w-full {previewMode === 'mobile' ? 'h-[500px]' : 'h-[600px]'}" sandbox="allow-scripts allow-same-origin"></iframe>
							{/if}
						</div>

						{#if previewMode === 'mobile'}
							<div class="bg-slate-800 px-4 py-3 flex items-center justify-center">
								<div class="w-10 h-10 rounded-full border-2 border-slate-600"></div>
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Right Panel - Sticky action area -->
			<div class="lg:sticky lg:top-24 space-y-6">
				<!-- Action Buttons -->
				{#if data.review.status === 'pending' || data.review.status === 'in_review'}
					<div class="bg-gradient-to-br from-indigo-500 via-blue-500 to-blue-600 rounded-2xl shadow-xl shadow-blue-500/20 p-6 text-white">
						<div class="flex items-center gap-3 mb-4">
							<div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
								<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<div>
								<h2 class="font-bold">確認をお願いします</h2>
								<p class="text-blue-100 text-xs">内容を確認してアクションを選択</p>
							</div>
						</div>
						<div class="space-y-3">
							<button
								type="button"
								onclick={() => showApproveModal = true}
								class="w-full px-4 py-3.5 bg-white text-emerald-600 rounded-xl hover:bg-emerald-50 font-bold transition-all hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg"
							>
								<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
								確認OK
							</button>
							<button
								type="button"
								onclick={() => showRejectModal = true}
								class="w-full px-4 py-3.5 bg-white/10 text-white rounded-xl hover:bg-white/20 font-bold transition-all hover:scale-[1.02] flex items-center justify-center gap-2 border border-white/20"
							>
								<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
								差し戻し
							</button>
						</div>
					</div>
				{:else}
					<div class="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
						<div class="text-center">
							{#if data.review.status === 'approved'}
								<div class="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
									<svg class="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
									</svg>
								</div>
								<h3 class="text-xl font-bold text-slate-900">確認完了</h3>
								<p class="text-sm text-slate-500 mt-2">このドキュメントは確認OKされました</p>
							{:else}
								<div class="w-20 h-20 bg-gradient-to-br from-red-100 to-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
									<svg class="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
									</svg>
								</div>
								<h3 class="text-xl font-bold text-slate-900">差し戻し済み</h3>
								<p class="text-sm text-slate-500 mt-2">このドキュメントは差し戻しされました</p>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Comments -->
				{#if commentTree.length > 0}
					<div class="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden">
						<div class="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
							<svg class="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
							</svg>
							<h3 class="font-semibold text-slate-900">コメント ({data.comments.length})</h3>
						</div>
						<div class="p-4 space-y-3 max-h-[400px] overflow-y-auto">
							{#each commentTree as comment}
								<div class="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4">
									<p class="text-sm text-slate-700 whitespace-pre-wrap">{comment.content}</p>
									<p class="text-xs text-slate-400 mt-3">{formatDate(comment.created_at)}</p>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</main>
</div>

<!-- Approve Modal -->
{#if showApproveModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onclick={() => showApproveModal = false}>
		<div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onclick={(e) => e.stopPropagation()}>
			<h3 class="text-xl font-bold text-slate-900 mb-4">確認OK</h3>
			<form method="POST" action="?/approve">
				<div class="space-y-4">
					<div>
						<label for="approveName" class="block text-sm font-medium text-slate-700 mb-1">お名前 <span class="text-red-500">*</span></label>
						<input type="text" id="approveName" name="guestName" required bind:value={guestName} class="w-full px-4 py-2 border border-slate-200 rounded-xl" placeholder="山田 太郎" />
					</div>
					<div>
						<label for="approveEmail" class="block text-sm font-medium text-slate-700 mb-1">メールアドレス（任意）</label>
						<input type="email" id="approveEmail" name="guestEmail" bind:value={guestEmail} class="w-full px-4 py-2 border border-slate-200 rounded-xl" placeholder="taro@example.com" />
					</div>
				</div>
				<div class="flex gap-3 mt-6">
					<button type="button" onclick={() => showApproveModal = false} class="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50">
						キャンセル
					</button>
					<button type="submit" class="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium">
						確認OK
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Reject Modal -->
{#if showRejectModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onclick={() => showRejectModal = false}>
		<div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onclick={(e) => e.stopPropagation()}>
			<h3 class="text-xl font-bold text-slate-900 mb-4">差し戻し</h3>
			<form method="POST" action="?/reject">
				<div class="space-y-4">
					<div>
						<label for="rejectName" class="block text-sm font-medium text-slate-700 mb-1">お名前 <span class="text-red-500">*</span></label>
						<input type="text" id="rejectName" name="guestName" required bind:value={guestName} class="w-full px-4 py-2 border border-slate-200 rounded-xl" placeholder="山田 太郎" />
					</div>
					<div>
						<label for="rejectEmail" class="block text-sm font-medium text-slate-700 mb-1">メールアドレス（任意）</label>
						<input type="email" id="rejectEmail" name="guestEmail" bind:value={guestEmail} class="w-full px-4 py-2 border border-slate-200 rounded-xl" placeholder="taro@example.com" />
					</div>
					<div>
						<label for="rejectReason" class="block text-sm font-medium text-slate-700 mb-1">差し戻し理由（任意）</label>
						<textarea id="rejectReason" name="reason" rows="3" bind:value={rejectReason} class="w-full px-4 py-2 border border-slate-200 rounded-xl resize-none" placeholder="修正が必要な点を記載してください"></textarea>
					</div>
				</div>
				<div class="flex gap-3 mt-6">
					<button type="button" onclick={() => showRejectModal = false} class="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50">
						キャンセル
					</button>
					<button type="submit" class="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium">
						差し戻し
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
