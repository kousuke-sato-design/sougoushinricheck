<script lang="ts">
	import AppLayout from '$lib/components/AppLayout.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const statusLabels: Record<string, string> = {
		draft: '作成済',
		shared: 'URL発行済',
		pending: '確認依頼中',
		in_review: '確認中',
		approved: '承認済',
		rejected: '差し戻し'
	};

	const statusColors: Record<string, string> = {
		draft: 'bg-slate-100 text-slate-600 border border-slate-300',
		shared: 'bg-purple-100 text-purple-800',
		pending: 'bg-yellow-100 text-yellow-800',
		in_review: 'bg-blue-100 text-blue-800',
		approved: 'bg-green-100 text-green-800',
		rejected: 'bg-red-100 text-red-800'
	};

	// Review state labels (confirmation status)
	const reviewStateLabels: Record<string, string> = {
		draft: '',
		shared: '未確認',
		pending: '未確認',
		in_review: '未確認',
		approved: '確認済',
		rejected: '差し戻し'
	};

	const reviewStateColors: Record<string, string> = {
		draft: '',
		shared: 'bg-gray-100 text-gray-600',
		pending: 'bg-gray-100 text-gray-600',
		in_review: 'bg-gray-100 text-gray-600',
		approved: 'bg-emerald-100 text-emerald-700',
		rejected: 'bg-red-100 text-red-700'
	};

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	let searchInput = $state(data.search);
	let copiedId = $state<string | null>(null);
	let loadingId = $state<string | null>(null);

	// Notify modal state
	let showNotifyModal = $state(false);
	let notifyReviewId = $state<string | null>(null);
	let notifyReviewTitle = $state('');
	let selectedUserIds = $state<string[]>([]);
	let notifyMessage = $state('');
	let notifyDueDate = $state('');
	let sendingNotify = $state(false);

	async function generateShareUrl(reviewId: string) {
		loadingId = reviewId;
		try {
			const res = await fetch(`/api/reviews/${reviewId}/share`, { method: 'POST' });
			const result = await res.json();

			if (result.token) {
				const shareUrl = `${window.location.origin}/p/${result.token}`;
				await navigator.clipboard.writeText(shareUrl);
				copiedId = reviewId;
				setTimeout(() => copiedId = null, 2000);
			} else {
				alert(result.error || 'エラーが発生しました');
			}
		} catch (err) {
			alert('エラーが発生しました');
		} finally {
			loadingId = null;
		}
	}

	function openNotifyModal(reviewId: string, reviewTitle: string) {
		notifyReviewId = reviewId;
		notifyReviewTitle = reviewTitle;
		notifyMessage = `「${reviewTitle}」の確認をお願いします。`;
		selectedUserIds = [];
		notifyDueDate = '';
		showNotifyModal = true;
	}

	function closeNotifyModal() {
		showNotifyModal = false;
		notifyReviewId = null;
	}

	function toggleUser(userId: string) {
		if (selectedUserIds.includes(userId)) {
			selectedUserIds = selectedUserIds.filter(id => id !== userId);
		} else {
			selectedUserIds = [...selectedUserIds, userId];
		}
	}

	async function sendNotify() {
		if (!notifyReviewId || selectedUserIds.length === 0) {
			alert('送信先を選択してください');
			return;
		}

		sendingNotify = true;
		try {
			const res = await fetch(`/api/reviews/${notifyReviewId}/notify`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userIds: selectedUserIds,
					message: notifyMessage,
					dueDate: notifyDueDate || null
				})
			});
			const result = await res.json();

			if (result.success) {
				alert(result.message);
				closeNotifyModal();
				window.location.reload();
			} else {
				alert(result.error || 'エラーが発生しました');
			}
		} catch (err) {
			alert('エラーが発生しました');
		} finally {
			sendingNotify = false;
		}
	}

	let deletingId = $state<string | null>(null);

	async function deleteReview(reviewId: string, title: string) {
		if (!confirm(`「${title}」を削除しますか？この操作は取り消せません。`)) {
			return;
		}

		deletingId = reviewId;
		try {
			const res = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' });
			const result = await res.json();

			if (result.success) {
				window.location.reload();
			} else {
				alert(result.error || '削除に失敗しました');
			}
		} catch (err) {
			alert('削除に失敗しました');
		} finally {
			deletingId = null;
		}
	}
</script>

<AppLayout user={data.user}>
	<div class="px-4 sm:px-0">
		<div class="flex items-center justify-between mb-6">
			<div class="flex items-center gap-4">
				<h1 class="text-2xl font-bold text-gray-900">ドキュメント一覧</h1>
				<div class="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
					<svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
					</svg>
					<span class="text-sm text-slate-600">
						メール: <span class="font-semibold {data.emailUsage.count >= data.emailUsage.limit * 0.9 ? 'text-red-600' : 'text-slate-900'}">{data.emailUsage.count}</span> / {data.emailUsage.limit}
					</span>
				</div>
			</div>
			<a
				href="/reviews/new"
				class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
			>
				新規作成
			</a>
		</div>

		<!-- Filters -->
		<div class="bg-white shadow rounded-lg p-4 mb-6">
			<form method="GET" class="flex flex-wrap gap-4 items-end">
				<div>
					<label for="filter" class="block text-sm font-medium text-gray-700 mb-1">
						表示
					</label>
					<select
						id="filter"
						name="filter"
						class="block w-40 px-3 py-2 border border-gray-300 rounded-md"
						value={data.filter}
					>
						<option value="assigned">依頼されたもの</option>
						<option value="created">依頼したもの</option>
					</select>
				</div>

				<div>
					<label for="status" class="block text-sm font-medium text-gray-700 mb-1">
						ステータス
					</label>
					<select
						id="status"
						name="status"
						class="block w-36 px-3 py-2 border border-gray-300 rounded-md"
						value={data.status}
					>
						<option value="all">すべて</option>
						<option value="draft">作成済</option>
						<option value="shared">URL発行済</option>
						<option value="pending">確認依頼中</option>
						<option value="in_review">確認中</option>
						<option value="approved">承認済</option>
						<option value="rejected">差し戻し</option>
					</select>
				</div>

				<div>
					<label for="sort" class="block text-sm font-medium text-gray-700 mb-1">
						並び順
					</label>
					<select
						id="sort"
						name="sort"
						class="block w-36 px-3 py-2 border border-gray-300 rounded-md"
						value={data.sort || 'newest'}
					>
						<option value="newest">新しい順</option>
						<option value="oldest">古い順</option>
						<option value="status">ステータス順</option>
					</select>
				</div>

				<div class="flex-1">
					<label for="search" class="block text-sm font-medium text-gray-700 mb-1">
						検索
					</label>
					<input
						type="text"
						id="search"
						name="search"
						placeholder="タイトルで検索..."
						class="block w-full px-3 py-2 border border-gray-300 rounded-md"
						bind:value={searchInput}
					/>
				</div>

				<button
					type="submit"
					class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
				>
					絞り込み
				</button>
			</form>
		</div>

		<!-- Review List -->
		<div class="bg-white shadow rounded-lg overflow-hidden">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							タイトル
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							タグ
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							ステータス
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							進捗
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							依頼者
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							期限
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							共有
						</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each data.reviews as review}
						<tr class="hover:bg-gray-50">
							<td class="px-6 py-4">
								<a href="/reviews/{review.id}" class="text-blue-600 hover:underline font-medium flex items-center gap-2">
									<span class="text-lg">{review.emoji || '📄'}</span>
									{review.title}
								</a>
							</td>
							<td class="px-6 py-4">
								<div class="flex flex-wrap gap-1.5">
									{#if review.tags && review.tags.length > 0}
										{#each review.tags as tag}
											<span
												class="px-2.5 py-1 text-xs font-bold rounded-full shadow-sm"
												style="background-color: {tag.color}; color: white"
											>
												{tag.name}
											</span>
										{/each}
									{:else}
										<span class="text-xs text-gray-400">-</span>
									{/if}
								</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="flex flex-wrap gap-1.5">
									<span class="px-2 py-1 text-xs rounded-full {statusColors[review.status]}">
										{statusLabels[review.status]}
									</span>
									{#if reviewStateLabels[review.status]}
										<span class="px-2 py-1 text-xs rounded-full {reviewStateColors[review.status]}">
											{reviewStateLabels[review.status]}
										</span>
									{/if}
								</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								{review.approved_count}/{review.total_assignees}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								{review.requester_name}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								{review.due_date ? formatDate(review.due_date) : '-'}
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="flex gap-2">
									<button
										type="button"
										onclick={() => generateShareUrl(review.id)}
										disabled={loadingId === review.id}
										class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors {copiedId === review.id ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}"
										title="共有リンクをコピー"
									>
										{#if loadingId === review.id}
											<svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
												<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
												<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
											</svg>
										{:else if copiedId === review.id}
											<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
											</svg>
										{:else}
											<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
											</svg>
										{/if}
										共有
									</button>
									<button
										type="button"
										onclick={() => openNotifyModal(review.id, review.title)}
										class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors bg-orange-50 text-orange-600 hover:bg-orange-100"
										title="確認依頼メールを送信"
									>
										<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
										</svg>
										依頼
									</button>
									<button
										type="button"
										onclick={() => deleteReview(review.id, review.title)}
										disabled={deletingId === review.id}
										class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors bg-red-50 text-red-600 hover:bg-red-100"
										title="削除"
									>
										{#if deletingId === review.id}
											<svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
												<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
												<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
											</svg>
										{:else}
											<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
											</svg>
										{/if}
										削除
									</button>
								</div>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="7" class="px-6 py-8 text-center text-gray-500">
								レビューが見つかりません
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Notify Modal -->
	{#if showNotifyModal}
		<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={closeNotifyModal}>
			<div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4" onclick={(e) => e.stopPropagation()}>
				<div class="px-6 py-4 border-b border-slate-200">
					<h3 class="text-lg font-semibold text-slate-900">確認依頼を送信</h3>
					<p class="text-sm text-slate-500 mt-1">{notifyReviewTitle}</p>
				</div>

				<div class="px-6 py-4 space-y-4">
					<!-- User Selection -->
					<div>
						<label class="block text-sm font-medium text-slate-700 mb-2">送信先</label>
						<div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-lg">
							{#each data.allUsers as user}
								<button
									type="button"
									onclick={() => toggleUser(user.id)}
									class="px-3 py-1.5 text-sm rounded-full transition-colors {selectedUserIds.includes(user.id) ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'}"
								>
									{user.name}
								</button>
							{/each}
						</div>
					</div>

					<!-- Due Date -->
					<div>
						<label for="notifyDueDate" class="block text-sm font-medium text-slate-700 mb-2">期限</label>
						<input
							type="date"
							id="notifyDueDate"
							bind:value={notifyDueDate}
							class="w-full px-3 py-2 border border-slate-200 rounded-lg"
						/>
					</div>

					<!-- Message -->
					<div>
						<label for="notifyMessage" class="block text-sm font-medium text-slate-700 mb-2">メッセージ</label>
						<textarea
							id="notifyMessage"
							bind:value={notifyMessage}
							rows="4"
							class="w-full px-3 py-2 border border-slate-200 rounded-lg resize-none"
							placeholder="確認依頼のメッセージを入力..."
						></textarea>
					</div>
				</div>

				<div class="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
					<button
						type="button"
						onclick={closeNotifyModal}
						class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
					>
						キャンセル
					</button>
					<button
						type="button"
						onclick={sendNotify}
						disabled={sendingNotify || selectedUserIds.length === 0}
						class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
					>
						{#if sendingNotify}
							<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							送信中...
						{:else}
							<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
							</svg>
							送信
						{/if}
					</button>
				</div>
			</div>
		</div>
	{/if}
</AppLayout>
