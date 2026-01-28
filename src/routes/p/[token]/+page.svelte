<script lang="ts">
	import '../../../app.css';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

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

	let guestName = $state('');
	let rejectReason = $state('');
	let sendNotification = $state(false);
	let showApproveModal = $state(false);
	let showEditModal = $state(false);
	let editTitle = $state(data.review.title);
	let editDescription = $state(data.review.description || '');

	// Update edit fields when data changes (after resubmit)
	$effect(() => {
		editTitle = data.review.title;
		editDescription = data.review.description || '';
	});

	// Clear comment input after successful rejection
	$effect(() => {
		if (form?.success && form?.action === 'rejected') {
			rejectReason = '';
		}
	});
</script>

<svelte:head>
	<title>{data.review.title} - 確認依頼</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
	<!-- Header -->
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

		<!-- Document Card -->
		<div class="bg-white rounded-2xl shadow-xl border border-slate-200/50">
			<!-- Document Header -->
			<div class="px-8 pt-8 pb-4">
				<div class="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-4xl mb-4">
					{data.review.emoji || '📄'}
				</div>
				<h1 class="text-3xl font-bold text-slate-900 mb-2">{data.review.title}</h1>
				<p class="text-sm text-slate-500">
					作成日: {formatDate(data.review.created_at)}
					{#if data.review.due_date}
						<span class="mx-2">•</span>
						<span class="text-amber-600">期限: {formatDate(data.review.due_date)}</span>
					{/if}
				</p>
			</div>

			<!-- Divider -->
			<div class="mx-8 border-t border-slate-200"></div>

			<!-- Content -->
			<div class="px-8 py-6">
				{#if data.review.description}
					<p class="text-slate-700 whitespace-pre-wrap leading-relaxed">{data.review.description}</p>
				{:else}
					<p class="text-slate-400 italic">内容がありません</p>
				{/if}
			</div>

			<!-- Action Section -->
			{#if data.review.status === 'pending' || data.review.status === 'shared'}
				<div class="px-8 py-6 bg-slate-50 border-t border-slate-200 rounded-b-2xl">
					<p class="text-sm text-slate-600 mb-4">内容を確認して、コメントを入力するか確認OKを押してください。</p>

					<!-- Comment/Reject Form -->
					<form method="POST" action="?/reject" class="mb-4">
						<input type="hidden" name="guestName" value={guestName || '確認者'} />
						<input type="hidden" name="sendNotification" value={sendNotification ? '1' : '0'} />
						<div class="bg-white border border-slate-300 rounded-xl p-4 shadow-inner mb-3">
							<textarea
								name="reason"
								rows="5"
								bind:value={rejectReason}
								placeholder="コメント・修正依頼を入力..."
								class="w-full bg-amber-50 px-4 py-3 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-none text-slate-700"
							></textarea>
							<div class="flex items-center justify-between mt-3">
								<label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
									<input
										type="checkbox"
										bind:checked={sendNotification}
										class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
									/>
									<svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
									</svg>
									メールで通知する（{data.review.requester_name}さんに送信）
								</label>
								<button
									type="submit"
									disabled={!rejectReason.trim()}
									class="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
								>
									<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
									</svg>
									差し戻し
								</button>
							</div>
						</div>
					</form>

					<!-- Approve Button -->
					<button
						type="button"
						onclick={() => showApproveModal = true}
						class="w-full px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium flex items-center justify-center gap-2"
					>
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
						確認OK
					</button>
				</div>
			{:else if data.review.status === 'approved'}
				<div class="px-8 py-6 bg-emerald-50 border-t border-emerald-200 rounded-b-2xl text-center">
					<svg class="w-12 h-12 text-emerald-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<p class="text-emerald-700 font-medium">このドキュメントは確認OKされました</p>
				</div>
			{:else if data.review.status === 'rejected'}
				<div class="px-8 py-6 bg-red-50 border-t border-red-200 rounded-b-2xl">
					<div class="text-center mb-4">
						<svg class="w-12 h-12 text-red-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<p class="text-red-700 font-medium">このドキュメントは差し戻しされました</p>
						<p class="text-sm text-red-600 mt-1">下のアクティビティでフィードバックを確認し、修正してください</p>
					</div>
					<div class="flex justify-center">
						<button
							type="button"
							onclick={() => showEditModal = true}
							class="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium flex items-center gap-2"
						>
							<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
							</svg>
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
						<svg class="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						アクティビティ ({data.comments.length})
					</h3>
				</div>
				<div class="p-6">
					<div class="relative">
						<!-- Timeline line -->
						<div class="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200"></div>

						<div class="space-y-6">
							{#each data.comments as comment, i}
								{@const isApproval = comment.content.includes('確認OK')}
								{@const isRejection = comment.content.includes('差し戻し')}
								<div class="relative flex gap-4">
									<!-- Timeline dot -->
									<div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center z-10 {isApproval ? 'bg-emerald-100' : isRejection ? 'bg-red-100' : 'bg-slate-100'}">
										{#if isApproval}
											<svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
											</svg>
										{:else if isRejection}
											<svg class="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										{:else}
											<svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
											</svg>
										{/if}
									</div>

									<!-- Content -->
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
	</main>
</div>

<!-- Approve Modal -->
{#if showApproveModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onclick={() => showApproveModal = false}>
		<div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onclick={(e) => e.stopPropagation()}>
			<h3 class="text-xl font-bold text-slate-900 mb-4">確認OK</h3>
			<form method="POST" action="?/approve">
				<div>
					<label for="approveName" class="block text-sm font-medium text-slate-700 mb-1">お名前 <span class="text-red-500">*</span></label>
					<input type="text" id="approveName" name="guestName" required bind:value={guestName} class="w-full px-4 py-2 border border-slate-200 rounded-xl" placeholder="山田 太郎" />
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

<!-- Edit Modal -->
{#if showEditModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onclick={() => showEditModal = false}>
		<div class="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6" onclick={(e) => e.stopPropagation()}>
			<h3 class="text-xl font-bold text-slate-900 mb-4">ドキュメントを修正</h3>
			<form method="POST" action="?/resubmit">
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
					<button type="submit" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium">
						保存して再依頼
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
