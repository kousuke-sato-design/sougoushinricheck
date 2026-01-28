<script lang="ts">
	import AppLayout from '$lib/components/AppLayout.svelte';
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

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

	// Get display name for a comment
	function getCommentName(comment: any): string {
		if (comment.guest_name) return comment.guest_name;
		if (comment.user_name) return comment.user_name;
		// Fallback: extract from old format
		const match = comment.content?.match(/【(.+?)】/);
		return match ? match[1] : '確認者';
	}

	// Get action type for a comment
	function getActionType(comment: any): string {
		if (comment.action_type) return comment.action_type;
		if (comment.content?.includes('確認OK')) return 'approved';
		if (comment.content?.includes('差し戻し')) return 'rejected';
		if (comment.content?.includes('再依頼')) return 'resubmitted';
		return 'comment';
	}

	// Get clean content (remove old format name prefix)
	function getCleanContent(comment: any): string {
		if (comment.action_type) return comment.content;
		return comment.content?.replace(/【.+?】(が確認OKしました|からのコメント:?\n?)/g, '').trim() || '';
	}

	// Format a single line of text (non-URL)
	function formatLine(line: string): string {
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
	}

	// Parse content into blocks (text or URL) for inline rendering
	type ContentBlock = { type: 'text'; html: string } | { type: 'url'; url: string; domain: string; isYoutube: boolean; youtubeId?: string };

	function parseContentBlocks(text: string): ContentBlock[] {
		if (!text) return [];
		const urlPattern = /^https?:\/\/[^\s]+$/;
		const blocks: ContentBlock[] = [];
		let textBuffer: string[] = [];

		const flushTextBuffer = () => {
			if (textBuffer.length > 0) {
				const html = textBuffer.map(formatLine).join('');
				if (html.replace(/<div class="h-3"><\/div>/g, '').trim()) {
					blocks.push({ type: 'text', html });
				}
				textBuffer = [];
			}
		};

		for (const line of text.split('\n')) {
			const trimmed = line.trim();
			if (urlPattern.test(trimmed)) {
				flushTextBuffer();
				try {
					const urlObj = new URL(trimmed);
					const isYoutube = urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be');
					blocks.push({
						type: 'url',
						url: trimmed,
						domain: urlObj.hostname.replace('www.', ''),
						isYoutube,
						youtubeId: isYoutube ? extractYouTubeId(trimmed) || undefined : undefined
					});
				} catch {
					blocks.push({ type: 'url', url: trimmed, domain: trimmed, isYoutube: false });
				}
			} else {
				textBuffer.push(line);
			}
		}
		flushTextBuffer();
		return blocks;
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

	// ロック状態と作成者判定
	let isLocked = $derived(data.review.is_locked === 1);
	let isOwner = $derived(data.user?.id === data.review.requester_id);
	let canEdit = $derived(!isLocked && isOwner);

	// Edit state（シンプル版）
	let editTitle = $state(data.review.title);
	let editEmoji = $state(data.review.emoji || '📄');
	let editDescription = $state(data.review.description || '');
	let selectedGoalIds = $state<string[]>(data.linkedGoals?.map((g: any) => g.id) || []);
	let showEmojiPicker = $state(false);

	// 初期値と比較用
	let initialGoalIds = $derived(data.linkedGoals?.map((g: any) => g.id).sort().join(',') || '');
	let currentGoalIds = $derived(selectedGoalIds.sort().join(','));

	let hasChanges = $derived(
		editTitle !== data.review.title ||
		editDescription !== (data.review.description || '') ||
		editEmoji !== (data.review.emoji || '📄') ||
		currentGoalIds !== initialGoalIds
	);

	function toggleGoalSelection(goalId: string) {
		if (selectedGoalIds.includes(goalId)) {
			selectedGoalIds = selectedGoalIds.filter(id => id !== goalId);
		} else {
			selectedGoalIds = [...selectedGoalIds, goalId];
		}
	}

	// 編集モード表示切り替え: 'split' = 2カラム, 'edit' = 編集のみ, 'preview' = プレビューのみ
	let editViewMode = $state<'split' | 'edit' | 'preview'>('split');

	// Modal states
	let commentText = $state('');
	let sendNotification = $state(false);
	let showDeleteModal = $state(false);
	let showNotifyModal = $state(false);
	let isSubmitting = $state(false);
	let isSaving = $state(false);
	let isSendingNotify = $state(false);
	let notifyMessage = $state('');
	let notifyDueDate = $state('');
	let selectedUserIds = $state<string[]>([]);
	let notifyResult = $state<{ success?: boolean; message?: string; error?: string } | null>(null);

	async function sendNotifyEmail() {
		if (selectedUserIds.length === 0) {
			notifyResult = { error: '送信先を選択してください' };
			return;
		}
		isSendingNotify = true;
		notifyResult = null;
		try {
			const res = await fetch(`/api/reviews/${data.review.id}/notify`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userIds: selectedUserIds,
					message: notifyMessage || `「${data.review.title}」の確認をお願いします。`,
					dueDate: notifyDueDate || null
				})
			});
			const result = await res.json();
			if (result.success) {
				notifyResult = { success: true, message: result.message };
				setTimeout(() => { showNotifyModal = false; notifyResult = null; }, 2000);
			} else {
				notifyResult = { error: result.error || 'エラーが発生しました' };
			}
		} catch (e) {
			notifyResult = { error: 'ネットワークエラー' };
		} finally {
			isSendingNotify = false;
		}
	}

	function toggleUserSelection(userId: string) {
		if (selectedUserIds.includes(userId)) {
			selectedUserIds = selectedUserIds.filter(id => id !== userId);
		} else {
			selectedUserIds = [...selectedUserIds, userId];
		}
	}

	// Emojis
	const emojis = [
		'📄', '📝', '📋', '📌', '📎', '🎯', '🎬', '🎥', '📺', '🎵',
		'💡', '⭐', '🔥', '✨', '💫', '🚀', '💪', '👍', '✅', '❌',
		'⚠️', '📢', '💬', '📊', '📈', '📉', '🗂️', '📁', '🔗', '🌐'
	];

	$effect(() => {
		editTitle = data.review.title;
		editDescription = data.review.description || '';
		editEmoji = data.review.emoji || '📄';
		selectedGoalIds = data.linkedGoals?.map((g: any) => g.id) || [];
	});

	$effect(() => {
		if (form?.success && (form?.action === 'rejected' || form?.action === 'commented' || form?.action === 'approved')) {
			commentText = '';
			isSubmitting = false;
		}
		if (form?.success && form?.action === 'updated') {
			isSaving = false;
		}
	});

	function handleSubmit() {
		isSubmitting = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			isSubmitting = false;
		};
	}

	function handleSave() {
		isSaving = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			isSaving = false;
		};
	}

</script>

<AppLayout user={data.user}>
	<div class="max-w-5xl mx-auto px-4">
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
				{:else if form.action === 'rejected' || form.action === 'commented'}
					コメントを送信しました。
				{:else if form.action === 'updated'}
					保存しました。
				{:else if form.action === 'locked'}
					ロックしました。
				{:else if form.action === 'unlocked'}
					ロックを解除しました。
				{/if}
			</div>
		{/if}

		{#if form?.error}
			<div class="mb-6 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
				{form.error}
			</div>
		{/if}

		<!-- Floating Save Button (変更がある場合のみ表示) -->
		{#if canEdit && hasChanges}
			<form method="POST" action="?/update" use:enhance={handleSave} class="fixed bottom-6 right-6 z-40">
				<input type="hidden" name="title" value={editTitle} />
				<input type="hidden" name="description" value={editDescription} />
				<input type="hidden" name="emoji" value={editEmoji} />
				<input type="hidden" name="goal_ids" value={selectedGoalIds.join(',')} />
				<button type="submit" disabled={isSaving} class="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-xl flex items-center gap-2 font-medium disabled:opacity-50">
					{#if isSaving}
						<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
						保存中...
					{:else}
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
						保存
					{/if}
				</button>
			</form>
		{/if}

		<!-- Main Content -->
			<div class="bg-white rounded-2xl shadow-xl border border-slate-200/50">
				<!-- Document Header -->
				<div class="px-6 sm:px-8 pt-6 sm:pt-8 pb-4">
					<div class="flex items-start justify-between gap-4">
						<div class="flex items-start gap-4">
							<!-- Emoji (編集可能 or 表示のみ) -->
							{#if canEdit}
								<div class="relative">
									<button type="button" onclick={() => showEmojiPicker = !showEmojiPicker} class="w-16 h-16 bg-slate-100 hover:bg-slate-200 rounded-2xl flex items-center justify-center text-4xl shrink-0 transition-colors cursor-pointer border-2 border-dashed border-transparent hover:border-blue-300">
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
							{:else}
								<div class="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-4xl shrink-0">
									{data.review.emoji || '📄'}
								</div>
							{/if}
							<div class="flex-1">
								<!-- Title (編集可能 or 表示のみ) -->
								{#if canEdit}
									<input type="text" bind:value={editTitle} placeholder="無題" class="w-full text-2xl sm:text-3xl font-bold text-slate-900 bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-slate-300 mb-2 hover:bg-slate-50 focus:bg-slate-50 rounded-lg px-2 -ml-2 transition-colors" />
								{:else}
									<h1 class="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">{data.review.title}</h1>
								{/if}
								<div class="flex items-center gap-3 flex-wrap">
									<span class="text-sm text-slate-500">
										作成者: {data.review.requester_name}
									</span>
								</div>
							</div>
						</div>
						<div class="flex items-center gap-2">
							{#if isOwner}
								<!-- 確認依頼送信ボタン（ロック時のみ） -->
								{#if isLocked}
									<button type="button" onclick={() => showNotifyModal = true} class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700">
										<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
										確認依頼を送信
									</button>
								{/if}
								<!-- ロック切替ボタン（作成者のみ） -->
								<form method="POST" action="?/toggleLock" use:enhance class="inline">
									<button type="submit" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium {isLocked ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}">
										{#if isLocked}
											<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
											ロック解除
										{:else}
											<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
											ロックする
										{/if}
									</button>
								</form>
								<button type="button" onclick={() => showDeleteModal = true} class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="削除">
									<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
								</button>
							{/if}
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

				<!-- 関連プロジェクト -->
				{#if data.goals && data.goals.length > 0}
					<div class="mx-6 sm:mx-8 p-4 bg-purple-50 border border-purple-200 rounded-xl">
						<p class="text-sm font-medium text-purple-700 mb-3">関連プロジェクト</p>
						{#if canEdit}
							<!-- 編集可能: チップ選択式 -->
							<div class="flex flex-wrap gap-2">
								{#each data.goals as goal}
									<button
										type="button"
										onclick={() => toggleGoalSelection(goal.id)}
										class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all {selectedGoalIds.includes(goal.id) ? 'ring-2 ring-offset-1 font-medium shadow-sm' : 'bg-white border border-purple-200 text-slate-600 hover:border-purple-400'}"
										style={selectedGoalIds.includes(goal.id) ? `background-color: ${goal.color}20; color: ${goal.color}; --tw-ring-color: ${goal.color}` : ''}
									>
										<span class="w-2 h-2 rounded-full shrink-0" style="background-color: {goal.color}"></span>
										{goal.title}
										{#if selectedGoalIds.includes(goal.id)}
											<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
										{/if}
									</button>
								{/each}
							</div>
						{:else}
							<!-- 閲覧モード: リンク付き表示 -->
							{#if data.linkedGoals && data.linkedGoals.length > 0}
								<div class="flex flex-wrap gap-2">
									{#each data.linkedGoals as goal}
										<a
											href="/goals/{goal.id}"
											class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors hover:opacity-80"
											style="background-color: {goal.color}20; color: {goal.color}"
										>
											<span class="w-2 h-2 rounded-full shrink-0" style="background-color: {goal.color}"></span>
											{goal.title}
											<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
										</a>
									{/each}
								</div>
							{:else}
								<p class="text-sm text-purple-400 italic">紐付けなし</p>
							{/if}
						{/if}
					</div>
				{/if}

				<!-- Public URL -->
				{#if data.review.public_token}
					<div class="mx-6 sm:mx-8 mt-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
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
					{#if canEdit}
						<!-- 編集モード -->
						{@const previewBlocks = parseContentBlocks(editDescription || '')}

						<!-- 表示モード切り替えタブ -->
						<div class="flex items-center gap-1 mb-4 p-1 bg-slate-100 rounded-lg w-fit">
							<button
								type="button"
								onclick={() => editViewMode = 'edit'}
								class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors {editViewMode === 'edit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
							>
								<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
								編集
							</button>
							<button
								type="button"
								onclick={() => editViewMode = 'split'}
								class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors {editViewMode === 'split' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
							>
								<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
								分割
							</button>
							<button
								type="button"
								onclick={() => editViewMode = 'preview'}
								class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors {editViewMode === 'preview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
							>
								<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
								プレビュー
							</button>
						</div>

						<!-- 編集のみ表示 -->
						{#if editViewMode === 'edit'}
							<textarea
								bind:value={editDescription}
								rows="25"
								placeholder="内容を入力...&#10;&#10;URLを単独行に入力するとカード表示されます。&#10;例: https://youtube.com/watch?v=xxx"
								class="w-full h-[600px] px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none text-slate-700 text-base leading-relaxed font-mono"
							></textarea>

						<!-- 分割表示 -->
						{:else if editViewMode === 'split'}
							<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
								<!-- 左: 編集エリア -->
								<div>
									<div class="flex items-center gap-2 mb-2">
										<span class="text-sm font-medium text-slate-600">📝 編集</span>
									</div>
									<textarea
										bind:value={editDescription}
										rows="20"
										placeholder="内容を入力...&#10;&#10;URLを単独行に入力するとカード表示されます。&#10;例: https://youtube.com/watch?v=xxx"
										class="w-full h-[500px] px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none text-slate-700 text-base leading-relaxed font-mono"
									></textarea>
								</div>
								<!-- 右: プレビュー -->
								<div>
									<div class="flex items-center gap-2 mb-2">
										<span class="text-sm font-medium text-slate-600">👁 プレビュー</span>
									</div>
									<div class="border border-slate-200 rounded-xl p-4 bg-slate-50 h-[500px] overflow-auto">
										{#if previewBlocks.length > 0}
											<div class="space-y-3">
												{#each previewBlocks as block}
													{#if block.type === 'text'}
														<div class="prose prose-slate max-w-none">
															{@html block.html}
														</div>
													{:else if block.type === 'url'}
														{#if block.isYoutube && block.youtubeId}
															<div class="rounded-xl overflow-hidden shadow-lg border border-slate-200 bg-black">
																<iframe width="100%" height="200" src="https://www.youtube.com/embed/{block.youtubeId}" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
																<a href={block.url} target="_blank" rel="noopener noreferrer" class="block px-4 py-2 bg-slate-900 hover:bg-slate-800 transition-colors">
																	<div class="flex items-center gap-2">
																		<span class="text-sm">🎬</span>
																		<span class="text-xs text-slate-300 truncate flex-1">{block.domain}</span>
																		<svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
																			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
																		</svg>
																	</div>
																</a>
															</div>
														{:else}
															<a href={block.url} target="_blank" rel="noopener noreferrer" class="block rounded-xl border border-slate-200 bg-white hover:shadow-md hover:border-blue-300 transition-all group">
																<div class="p-4 flex items-center gap-3">
																	<div class="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-2xl shrink-0">{getDomainIcon(block.domain)}</div>
																	<div class="flex-1 min-w-0">
																		<p class="text-base font-medium text-slate-900 truncate">{block.domain}</p>
																		<p class="text-sm text-slate-400 truncate">{block.url.replace(/^https?:\/\//, '').slice(0, 60)}...</p>
																	</div>
																	<svg class="w-5 h-5 text-slate-300 group-hover:text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
																		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
																	</svg>
																</div>
															</a>
														{/if}
													{/if}
												{/each}
											</div>
										{:else}
											<p class="text-slate-400 italic text-center py-12">プレビューがここに表示されます</p>
										{/if}
									</div>
								</div>
							</div>

						<!-- プレビューのみ表示 -->
						{:else}
							<div class="border border-slate-200 rounded-xl p-6 bg-slate-50 min-h-[600px] overflow-auto">
								{#if previewBlocks.length > 0}
									<div class="space-y-4">
										{#each previewBlocks as block}
											{#if block.type === 'text'}
												<div class="prose prose-slate max-w-none">
													{@html block.html}
												</div>
											{:else if block.type === 'url'}
												{#if block.isYoutube && block.youtubeId}
													<div class="rounded-xl overflow-hidden shadow-lg border border-slate-200 bg-black max-w-2xl">
														<iframe width="100%" height="360" src="https://www.youtube.com/embed/{block.youtubeId}" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
														<a href={block.url} target="_blank" rel="noopener noreferrer" class="block px-4 py-2 bg-slate-900 hover:bg-slate-800 transition-colors">
															<div class="flex items-center gap-2">
																<span class="text-sm">🎬</span>
																<span class="text-xs text-slate-300 truncate flex-1">{block.domain}</span>
																<svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
																</svg>
															</div>
														</a>
													</div>
												{:else}
													<a href={block.url} target="_blank" rel="noopener noreferrer" class="block rounded-xl border border-slate-200 bg-white hover:shadow-md hover:border-blue-300 transition-all group max-w-xl">
														<div class="p-4 flex items-center gap-3">
															<div class="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-2xl shrink-0">{getDomainIcon(block.domain)}</div>
															<div class="flex-1 min-w-0">
																<p class="text-base font-medium text-slate-900 truncate">{block.domain}</p>
																<p class="text-sm text-slate-400 truncate">{block.url.replace(/^https?:\/\//, '').slice(0, 60)}...</p>
															</div>
															<svg class="w-5 h-5 text-slate-300 group-hover:text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
															</svg>
														</div>
													</a>
												{/if}
											{/if}
										{/each}
									</div>
								{:else}
									<p class="text-slate-400 italic text-center py-12">プレビューがここに表示されます</p>
								{/if}
							</div>
						{/if}
					{:else}
						<!-- 閲覧モード: テキストとURLが交互に表示 -->
						{@const viewBlocks = parseContentBlocks(data.review.description || '')}
						{#if viewBlocks.length > 0}
							<div class="space-y-3">
								{#each viewBlocks as block}
									{#if block.type === 'text'}
										<div class="prose prose-slate max-w-none">
											{@html block.html}
										</div>
									{:else if block.type === 'url'}
										{#if block.isYoutube && block.youtubeId}
											<div class="rounded-xl overflow-hidden shadow-lg border border-slate-200 bg-black">
												<iframe width="100%" height="360" src="https://www.youtube.com/embed/{block.youtubeId}" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
												<a href={block.url} target="_blank" rel="noopener noreferrer" class="block px-4 py-2 bg-slate-900 hover:bg-slate-800 transition-colors">
													<div class="flex items-center gap-2">
														<span class="text-sm">🎬</span>
														<span class="text-xs text-slate-300 truncate flex-1">{block.domain}</span>
														<svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
														</svg>
													</div>
												</a>
											</div>
										{:else}
											<a href={block.url} target="_blank" rel="noopener noreferrer" class="block rounded-xl border border-slate-200 bg-white hover:shadow-md hover:border-blue-300 transition-all group">
												<div class="p-4 flex items-center gap-3">
													<div class="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-2xl shrink-0">{getDomainIcon(block.domain)}</div>
													<div class="flex-1 min-w-0">
														<p class="text-base font-medium text-slate-900 truncate">{block.domain}</p>
														<p class="text-sm text-slate-400 truncate">{block.url.replace(/^https?:\/\//, '').slice(0, 60)}...</p>
													</div>
													<svg class="w-5 h-5 text-slate-300 group-hover:text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
													</svg>
												</div>
											</a>
										{/if}
									{/if}
								{/each}
							</div>
						{:else}
							<div class="text-center py-12">
								<p class="text-slate-400 italic">内容がありません</p>
							</div>
						{/if}
					{/if}
				</div>

				<!-- Unified Check Section (同じデザインで統一) -->
				<div class="px-6 sm:px-8 py-6 bg-slate-50 border-t border-slate-200 rounded-b-2xl">
					<!-- 承認者がいる場合は表示 -->
					{#if data.approvers && data.approvers.length > 0}
						<div class="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
							<div class="flex items-center gap-2 mb-3">
								<svg class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<span class="text-sm font-medium text-emerald-700">確認済み ({data.approvers.length}人)</span>
							</div>
							<div class="flex flex-wrap gap-2">
								{#each data.approvers as approver}
									<span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-200 rounded-full text-sm">
										<svg class="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
										</svg>
										<span class="font-medium text-emerald-900">{approver.guest_name}</span>
									</span>
								{/each}
							</div>
						</div>
					{/if}

					<h3 class="text-sm font-semibold text-slate-700 mb-4">あなたの確認</h3>

					<!-- 確認者名（ログイン時は自動表示） -->
					<div class="mb-4">
						<label class="block text-sm font-medium text-slate-600 mb-1">お名前</label>
						<div class="px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700">
							{data.user.name}
						</div>
					</div>

					<!-- コメント入力 -->
					<form method="POST" action="?/reject" use:enhance={handleSubmit} class="mb-4">
						<input type="hidden" name="sendNotification" value={sendNotification ? '1' : '0'} />
						<div class="bg-white border border-slate-200 rounded-xl p-4">
							<label class="block text-sm font-medium text-slate-600 mb-1">コメント（任意）</label>
							<textarea
								name="reason"
								rows="4"
								bind:value={commentText}
								disabled={isSubmitting}
								placeholder="コメント・質問を入力..."
								class="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-none text-slate-700 disabled:opacity-50"
							></textarea>
							<div class="flex items-center justify-between mt-3 flex-wrap gap-3">
								<label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
									<input type="checkbox" bind:checked={sendNotification} class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
									<svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
									メールで通知
								</label>
								<button
									type="submit"
									disabled={!commentText.trim() || isSubmitting}
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

					<!-- 確認OKボタン -->
					<form method="POST" action="?/approve" use:enhance={handleSubmit}>
						<button
							type="submit"
							disabled={isSubmitting}
							class="w-full px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{#if isSubmitting}
								<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
								送信中...
							{:else}
								<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
								確認OK
							{/if}
						</button>
					</form>
				</div>
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
							<div class="space-y-4">
								{#each data.comments as comment}
									{@const actionType = getActionType(comment)}
									{@const displayName = getCommentName(comment)}
									{@const cleanContent = getCleanContent(comment)}
									<div class="relative flex gap-4">
										<!-- Timeline dot with initial -->
										<div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center z-10 text-white text-xs font-bold {actionType === 'approved' ? 'bg-emerald-500' : actionType === 'comment' || actionType === 'rejected' ? 'bg-amber-500' : 'bg-blue-500'}">
											{displayName.charAt(0)}
										</div>

										<!-- Content -->
										<div class="flex-1 pb-2">
											<!-- Header: Name tag + Action type -->
											<div class="flex items-center gap-2 mb-2 flex-wrap">
												<span class="inline-flex items-center px-2.5 py-1 bg-slate-100 rounded-full text-sm font-medium text-slate-800">
													{displayName}
												</span>
												<span class="px-2 py-0.5 text-xs font-medium rounded-full {actionTypeColors[actionType]}">
													{actionTypeLabels[actionType] || actionType}
												</span>
												<span class="text-xs text-slate-400">{formatShortDate(comment.created_at)}</span>
											</div>

											<!-- Comment content (if any) -->
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
				</div>
			{/if}
	</div>
</AppLayout>

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

<!-- Notify Modal (確認依頼送信) -->
{#if showNotifyModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onclick={() => showNotifyModal = false}>
		<div class="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6" onclick={(e) => e.stopPropagation()}>
			<h3 class="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
				<svg class="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
				確認依頼を送信
			</h3>

			{#if notifyResult?.success}
				<div class="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 mb-4">
					{notifyResult.message}
				</div>
			{/if}

			{#if notifyResult?.error}
				<div class="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 mb-4">
					{notifyResult.error}
				</div>
			{/if}

			<!-- 送信先選択 -->
			<div class="mb-4">
				<label class="block text-sm font-medium text-slate-700 mb-2">送信先を選択</label>
				<div class="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
					{#each data.users as user}
						<label class="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer {selectedUserIds.includes(user.id) ? 'bg-emerald-50' : ''}">
							<input type="checkbox" checked={selectedUserIds.includes(user.id)} onchange={() => toggleUserSelection(user.id)} class="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
							<span class="text-sm text-slate-700">{user.name}</span>
							<span class="text-xs text-slate-400">{user.email}</span>
						</label>
					{/each}
				</div>
			</div>

			<!-- 期限設定 -->
			<div class="mb-4">
				<label class="block text-sm font-medium text-slate-700 mb-2">期限（任意）</label>
				<input type="datetime-local" bind:value={notifyDueDate} class="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400" />
			</div>

			<!-- メッセージ -->
			<div class="mb-4">
				<label class="block text-sm font-medium text-slate-700 mb-2">メッセージ（任意）</label>
				<textarea bind:value={notifyMessage} rows="3" placeholder="確認をお願いします。" class="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"></textarea>
			</div>

			<div class="flex gap-3">
				<button type="button" onclick={() => showNotifyModal = false} class="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50">キャンセル</button>
				<button type="button" onclick={sendNotifyEmail} disabled={isSendingNotify || selectedUserIds.length === 0} class="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
					{#if isSendingNotify}
						<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
						送信中...
					{:else}
						送信する
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
