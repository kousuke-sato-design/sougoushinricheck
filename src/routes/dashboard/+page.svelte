<script lang="ts">
	import AppLayout from '$lib/components/AppLayout.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const statusLabels: Record<string, string> = {
		pending: '依頼中',
		in_review: '確認中',
		approved: '承認済',
		rejected: '差し戻し'
	};

	const statusColors: Record<string, string> = {
		pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
		in_review: 'bg-blue-50 text-blue-700 ring-blue-600/20',
		approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
		rejected: 'bg-red-50 text-red-700 ring-red-600/20'
	};

	const contentTypeLabels: Record<string, string> = {
		web: 'Web/LP',
		blog: 'ブログ/PR',
		design: 'デザイン',
		document: 'ドキュメント',
		other: 'その他'
	};

	const contentTypeColors: Record<string, string> = {
		web: 'bg-violet-100 text-violet-700',
		blog: 'bg-pink-100 text-pink-700',
		design: 'bg-cyan-100 text-cyan-700',
		document: 'bg-orange-100 text-orange-700',
		other: 'bg-slate-100 text-slate-700'
	};

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('ja-JP', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatRelativeTime(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return 'たった今';
		if (minutes < 60) return `${minutes}分前`;
		if (hours < 24) return `${hours}時間前`;
		if (days < 7) return `${days}日前`;
		return formatDate(dateStr);
	}
</script>

<AppLayout user={data.user}>
	<!-- Page Header -->
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-slate-900">ダッシュボード</h1>
		<p class="mt-1 text-slate-500">こんにちは、{data.user.name}さん</p>
	</div>

	<!-- Stats Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
		<div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
			<div class="flex items-center gap-4">
				<div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
					<svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
					</svg>
				</div>
				<div>
					<p class="text-2xl font-bold text-slate-900">{data.assignedReviews.length}</p>
					<p class="text-sm text-slate-500">確認待ち</p>
				</div>
			</div>
		</div>

		<div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
			<div class="flex items-center gap-4">
				<div class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
					<svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
					</svg>
				</div>
				<div>
					<p class="text-2xl font-bold text-slate-900">{data.myReviews.length}</p>
					<p class="text-sm text-slate-500">依頼中</p>
				</div>
			</div>
		</div>

		<div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
			<div class="flex items-center gap-4">
				<div class="w-12 h-12 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
					<svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
					</svg>
				</div>
				<div>
					<p class="text-2xl font-bold text-slate-900">{data.recentActivity.length}</p>
					<p class="text-sm text-slate-500">最近の活動</p>
				</div>
			</div>
		</div>

		<a href="/reviews/new" class="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 group">
			<div class="flex items-center gap-4">
				<div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
					<svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
				</div>
				<div>
					<p class="text-lg font-bold text-white">新規依頼</p>
					<p class="text-sm text-blue-100">レビューを作成</p>
				</div>
			</div>
		</a>
	</div>

	<div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
		<!-- Assigned Reviews -->
		<div class="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
			<div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
				<div>
					<h2 class="text-lg font-semibold text-slate-900">あなたへの依頼</h2>
					<p class="text-sm text-slate-500">確認待ちのレビュー</p>
				</div>
				<a href="/reviews?filter=assigned" class="text-sm text-blue-600 hover:text-blue-700 font-medium">
					すべて見る →
				</a>
			</div>
			<div class="divide-y divide-slate-100">
				{#each data.assignedReviews.slice(0, 5) as review}
					<a href="/reviews/{review.id}" class="block px-6 py-4 hover:bg-slate-50 transition-colors">
						<div class="flex items-start justify-between gap-4">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1">
									<span class="px-2 py-0.5 text-xs font-medium rounded-md {contentTypeColors[review.content_type] || contentTypeColors.other}">
										{contentTypeLabels[review.content_type] || review.content_type}
									</span>
								</div>
								<h3 class="font-medium text-slate-900 truncate">{review.title}</h3>
								<p class="text-sm text-slate-500 mt-0.5">
									{review.requester_name} さんからの依頼
								</p>
							</div>
							<div class="text-right shrink-0">
								{#if review.due_date}
									<p class="text-xs text-slate-400">期限</p>
									<p class="text-sm font-medium text-slate-600">{formatDate(review.due_date)}</p>
								{/if}
							</div>
						</div>
					</a>
				{:else}
					<div class="px-6 py-12 text-center">
						<div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<svg class="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<p class="text-slate-500 font-medium">確認待ちのレビューはありません</p>
						<p class="text-sm text-slate-400 mt-1">新しい依頼が届くとここに表示されます</p>
					</div>
				{/each}
			</div>
		</div>

		<!-- My Reviews -->
		<div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
			<div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
				<div>
					<h2 class="text-lg font-semibold text-slate-900">あなたの依頼</h2>
					<p class="text-sm text-slate-500">依頼中のレビュー</p>
				</div>
				<a href="/reviews?filter=created" class="text-sm text-blue-600 hover:text-blue-700 font-medium">
					すべて見る →
				</a>
			</div>
			<div class="divide-y divide-slate-100">
				{#each data.myReviews.slice(0, 5) as review}
					<a href="/reviews/{review.id}" class="block px-6 py-4 hover:bg-slate-50 transition-colors">
						<div class="flex items-center justify-between gap-3 mb-2">
							<h3 class="font-medium text-slate-900 truncate flex-1">{review.title}</h3>
							<span class="px-2 py-0.5 text-xs font-medium rounded-full ring-1 ring-inset {statusColors[review.status]}">
								{statusLabels[review.status]}
							</span>
						</div>
						<div class="flex items-center gap-2">
							<div class="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
								<div
									class="bg-emerald-500 h-full rounded-full transition-all"
									style="width: {review.total_assignees > 0 ? (review.approved_count / review.total_assignees) * 100 : 0}%"
								></div>
							</div>
							<span class="text-xs text-slate-500 shrink-0">
								{review.approved_count}/{review.total_assignees}
							</span>
						</div>
					</a>
				{:else}
					<div class="px-6 py-12 text-center">
						<div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<svg class="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<p class="text-slate-500 font-medium">依頼中のレビューはありません</p>
						<a href="/reviews/new" class="text-sm text-blue-600 hover:text-blue-700 mt-1 inline-block">
							新規依頼を作成 →
						</a>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Recent Activity -->
	<div class="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
		<div class="px-6 py-4 border-b border-slate-100">
			<h2 class="text-lg font-semibold text-slate-900">最近のアクティビティ</h2>
		</div>
		<div class="divide-y divide-slate-100">
			{#each data.recentActivity.slice(0, 5) as activity}
				<div class="px-6 py-4 flex items-start gap-4">
					<div class="w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0">
						{activity.user_name.charAt(0)}
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm text-slate-900">
							<span class="font-medium">{activity.user_name}</span>
							<span class="text-slate-500">が</span>
							<a href="/reviews/{activity.review_id}" class="font-medium text-blue-600 hover:text-blue-700">
								{activity.review_title}
							</a>
							<span class="text-slate-500">にコメントしました</span>
						</p>
						<p class="mt-1 text-sm text-slate-600 line-clamp-2 bg-slate-50 rounded-lg p-2">
							{activity.content}
						</p>
						<p class="mt-2 text-xs text-slate-400">
							{formatRelativeTime(activity.created_at)}
						</p>
					</div>
				</div>
			{:else}
				<div class="px-6 py-12 text-center">
					<div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<svg class="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
						</svg>
					</div>
					<p class="text-slate-500 font-medium">最近のアクティビティはありません</p>
					<p class="text-sm text-slate-400 mt-1">コメントや承認があるとここに表示されます</p>
				</div>
			{/each}
		</div>
	</div>
</AppLayout>
