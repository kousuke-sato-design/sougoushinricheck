<script lang="ts">
	import AppLayout from '$lib/components/AppLayout.svelte';
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let isAuthenticated = $derived(data.isAuthenticated);

	const flipDurationMs = 200;

	// Modal states
	let showEditProject = $state(false);
	let showAddTaskModal = $state(false);
	let showObjectiveModal = $state(false);
	let showCreateCheckModal = $state(false);
	let editingTask = $state<any>(null);
	let editingObjective = $state<any>(null);
	let selectedColor = $state(data.goal.color);

	// Form states
	let newObjective = $state('');
	let newObjectiveDate = $state('');
	let newObjectiveColor = $state('#3b82f6');
	let newCheckTitle = $state('');
	let newCheckFromObjectiveTitle = $state('');
	let selectedObjectiveForCheck = $state<any>(null);
	let showCreateCheckFromObjectiveModal = $state(false);

	// Notify modal state (same as /reviews)
	let showNotifyModal = $state(false);
	let notifyReviewId = $state<string | null>(null);
	let notifyReviewTitle = $state('');
	let selectedUserIds = $state<string[]>([]);
	let notifyMessage = $state('');
	let notifyDueDate = $state('');
	let sendingNotify = $state(false);

	// Share URL state
	let copiedId = $state<string | null>(null);
	let loadingId = $state<string | null>(null);
	let deletingId = $state<string | null>(null);

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

	async function deleteReviewFromList(reviewId: string, title: string) {
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

	// Calendar state
	let calendarMonth = $state(new Date().getMonth());
	let calendarYear = $state(new Date().getFullYear());

	// Expanded tile state (null = all tiles visible, 'objectives' | 'tasks' | 'calendar' | 'checks' = that tile expanded)
	let expandedTile = $state<'objectives' | 'tasks' | 'calendar' | 'checks' | null>(null);

	function toggleExpand(tile: 'objectives' | 'tasks' | 'calendar' | 'checks') {
		expandedTile = expandedTile === tile ? null : tile;
	}

	const statusLabels: Record<string, string> = {
		pending: '未着手', in_progress: '進行中', completed: '完了', on_hold: '保留'
	};

	const statusColors: Record<string, string> = {
		pending: 'bg-slate-100 text-slate-600',
		in_progress: 'bg-blue-100 text-blue-700',
		completed: 'bg-green-100 text-green-700',
		on_hold: 'bg-amber-100 text-amber-700'
	};

	const taskStatusLabels: Record<string, string> = {
		pending: '未着手', in_progress: '進行中', completed: '完了'
	};

	const taskStatusColors: Record<string, string> = {
		pending: 'bg-slate-50 border-slate-200',
		in_progress: 'bg-blue-50 border-blue-200',
		completed: 'bg-green-50 border-green-200'
	};

	const colors = [
		{ value: '#3b82f6', name: '青' }, { value: '#ef4444', name: '赤' },
		{ value: '#10b981', name: '緑' }, { value: '#f59e0b', name: '黄' },
		{ value: '#8b5cf6', name: '紫' }, { value: '#ec4899', name: 'ピンク' },
		{ value: '#06b6d4', name: 'シアン' }, { value: '#6b7280', name: 'グレー' }
	];

	const objectiveColors = [
		{ value: '#ef4444', name: '赤' }, { value: '#f97316', name: 'オレンジ' },
		{ value: '#eab308', name: '黄' }, { value: '#22c55e', name: '緑' },
		{ value: '#3b82f6', name: '青' }, { value: '#8b5cf6', name: '紫' },
		{ value: '#ec4899', name: 'ピンク' }, { value: '#06b6d4', name: 'シアン' }
	];

	// Helpers
	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
	}

	function formatDateLong(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
	}

	function formatDateForInput(dateStr: string): string {
		return new Date(dateStr).toISOString().split('T')[0];
	}

	function getTaskProgress(): { completed: number; total: number; percent: number } {
		const total = data.goal.tasks.length;
		if (total === 0) return { completed: 0, total: 0, percent: 0 };
		const completed = data.goal.tasks.filter((t: { status: string }) => t.status === 'completed').length;
		return { completed, total, percent: Math.round((completed / total) * 100) };
	}

	function getObjectivesProgress(): { completed: number; total: number; percent: number } {
		const total = data.goal.objectives?.length || 0;
		if (total === 0) return { completed: 0, total: 0, percent: 0 };
		const completed = data.goal.objectives.filter((o: { is_completed: number }) => o.is_completed === 1).length;
		return { completed, total, percent: Math.round((completed / total) * 100) };
	}

	// Task drag and drop
	interface Task { id: string; title: string; description?: string; due_date?: string; status: string; sort_order: number; }

	function getTasksByStatus() {
		return {
			pending: data.goal.tasks.filter((t: Task) => t.status === 'pending').map((t: Task) => ({ ...t })),
			in_progress: data.goal.tasks.filter((t: Task) => t.status === 'in_progress').map((t: Task) => ({ ...t })),
			completed: data.goal.tasks.filter((t: Task) => t.status === 'completed').map((t: Task) => ({ ...t }))
		};
	}

	let tasksByStatus = $state(getTasksByStatus());
	$effect(() => { const _ = data.goal.tasks; tasksByStatus = getTasksByStatus(); });

	function handleDndConsider(status: string, e: CustomEvent<{ items: Task[] }>) {
		tasksByStatus[status as keyof typeof tasksByStatus] = e.detail.items;
	}

	async function handleDndFinalize(status: string, e: CustomEvent<{ items: Task[] }>) {
		const newItems = e.detail.items;
		tasksByStatus[status as keyof typeof tasksByStatus] = newItems;
		const tasksToUpdate = newItems.map((task, index) => ({ id: task.id, status, sort_order: index }));
		if (tasksToUpdate.length > 0) {
			const formData = new FormData();
			formData.append('tasks', JSON.stringify(tasksToUpdate));
			try { await fetch('?/reorderTasks', { method: 'POST', body: formData }); await invalidateAll(); }
			catch { await invalidateAll(); }
		}
	}

	// Calendar
	const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
	const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

	function getDaysInMonth(year: number, month: number): Date[] {
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const days: Date[] = [];
		for (let i = firstDay.getDay() - 1; i >= 0; i--) days.push(new Date(year, month, -i));
		for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
		const endPadding = 6 - lastDay.getDay();
		for (let i = 1; i <= endPadding; i++) days.push(new Date(year, month + 1, i));
		return days;
	}

	function isCurrentMonth(date: Date): boolean { return date.getMonth() === calendarMonth; }
	function isToday(date: Date): boolean { return date.toDateString() === new Date().toDateString(); }

	function getItemsForDate(date: Date) {
		const dateStr = date.toISOString().split('T')[0];
		return {
			tasks: data.goal.tasks.filter((t: { due_date: string }) => t.due_date && new Date(t.due_date).toISOString().split('T')[0] === dateStr),
			objectives: (data.goal.objectives || []).filter((o: { due_date: string }) => o.due_date && new Date(o.due_date).toISOString().split('T')[0] === dateStr)
		};
	}

	function navigateMonth(dir: number) {
		calendarMonth += dir;
		if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
		else if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
	}

	const calendarDays = $derived(getDaysInMonth(calendarYear, calendarMonth));
	const taskProgress = $derived(getTaskProgress());
	const objectivesProgress = $derived(getObjectivesProgress());

	const checkStatusColors: Record<string, string> = { draft: 'bg-slate-100 text-slate-600', pending: 'bg-amber-100 text-amber-700', shared: 'bg-blue-100 text-blue-700', in_review: 'bg-blue-100 text-blue-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' };
	const checkStatusLabels: Record<string, string> = { draft: '下書き', pending: '未確認', shared: '確認待ち', in_review: '確認中', approved: '確認済', rejected: '差し戻し' };
</script>

{#if isAuthenticated}
<AppLayout user={data.user}>
{@render pageContent()}
</AppLayout>
{:else}
<div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
	<header class="bg-white border-b border-slate-200">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 py-3">
			<div class="flex items-center gap-3">
				<div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
					<svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
				</div>
				<span class="text-sm font-medium text-slate-600">プロジェクト詳細</span>
			</div>
		</div>
	</header>
	<div class="py-6">
		{@render pageContent()}
	</div>
</div>
{/if}

{#snippet pageContent()}
	<div class="max-w-7xl mx-auto px-4 sm:px-6">
		<!-- Header -->
		<div class="mb-4 sm:mb-6">
			{#if isAuthenticated}
				<a href="/goals" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2">
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
					プロジェクト一覧
				</a>
			{/if}
			<div class="flex items-start justify-between gap-2 sm:gap-4">
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2 flex-wrap">
						<div class="w-3 h-3 rounded-full shrink-0" style="background-color: {data.goal.color}"></div>
						<h1 class="text-lg sm:text-2xl font-bold text-slate-900 truncate">{data.goal.title}</h1>
						<span class="px-2 py-0.5 text-xs font-semibold rounded-full {statusColors[data.goal.status]}">{statusLabels[data.goal.status]}</span>
					</div>
					<div class="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-500 flex-wrap">
						<span class="flex items-center gap-1">
							<svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
							{formatDateLong(data.goal.due_date)}
						</span>
						{#if data.goal.assignees?.length > 0}
							<span class="flex items-center gap-1">
								<svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
								{data.goal.assignees.map((a: { name: string }) => a.name).join(', ')}
							</span>
						{/if}
					</div>
				</div>
				{#if isAuthenticated}
					<button type="button" onclick={() => showEditProject = true} class="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg shrink-0">
						<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
					</button>
				{/if}
			</div>
		</div>

		<!-- Back to grid button when expanded -->
		{#if expandedTile}
			<div class="mb-3">
				<button type="button" onclick={() => expandedTile = null} class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
					4タイル表示に戻る
				</button>
			</div>
		{/if}

		<!-- Layout with expand support -->
		<div class="space-y-3 sm:space-y-4">
			<!-- Row 1: 目標 (横長・全幅) -->
			{#if !expandedTile || expandedTile === 'objectives'}
			<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden {expandedTile === 'objectives' ? 'ring-2 ring-blue-500' : ''}">
				<div class="px-3 sm:px-4 py-2 border-b border-slate-100 flex items-center justify-between">
					<h2 class="font-semibold text-slate-900 text-sm sm:text-base flex items-center gap-2">
						🎯 目標
						<span class="text-xs font-normal text-slate-500">{objectivesProgress.completed}/{objectivesProgress.total}</span>
					</h2>
					<div class="flex items-center gap-2">
						<div class="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
							<div class="h-full rounded-full transition-all" style="width: {objectivesProgress.percent}%; background-color: {data.goal.color}"></div>
						</div>
						<button type="button" onclick={() => toggleExpand('objectives')} class="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600" title={expandedTile === 'objectives' ? '縮小' : '拡大'}>
							{#if expandedTile === 'objectives'}
								<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
							{:else}
								<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
							{/if}
						</button>
					</div>
				</div>
				<div class="p-2 sm:p-3">
					<!-- Add objective -->
					{#if isAuthenticated}
					<form method="POST" action="?/addObjective" use:enhance={() => { return async ({ update }) => { newObjective = ''; newObjectiveDate = ''; newObjectiveColor = '#3b82f6'; await update(); }; }} class="mb-2">
						<div class="flex gap-2 items-center">
							<div class="flex gap-0.5 shrink-0">
								{#each objectiveColors.slice(0, 4) as color}
									<button type="button" onclick={() => newObjectiveColor = color.value} class="w-5 h-5 rounded-full border-2 transition-all {newObjectiveColor === color.value ? 'border-slate-900 scale-110' : 'border-transparent'}" style="background-color: {color.value}"></button>
								{/each}
							</div>
							<input type="hidden" name="color" value={newObjectiveColor} />
							<input type="text" name="title" bind:value={newObjective} placeholder="新しい目標..." class="flex-1 min-w-0 px-2 py-1 text-sm bg-slate-50 border-0 rounded focus:ring-2 focus:ring-blue-500" />
							<input type="date" id="new_obj_date" name="due_date" bind:value={newObjectiveDate} class="sr-only" />
							<button type="button" onclick={() => document.getElementById('new_obj_date')?.showPicker()} class="p-1 rounded text-slate-400 hover:text-slate-600 shrink-0 {newObjectiveDate ? 'text-blue-600 bg-blue-50' : ''}">
								<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
							</button>
							<button type="submit" disabled={!newObjective.trim()} class="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 shrink-0">追加</button>
						</div>
					</form>
					{/if}
					{#if data.goal.objectives && data.goal.objectives.length > 0}
						<div class="space-y-2">
							{#each data.goal.objectives as objective}
								<div class="flex items-center gap-3 px-4 py-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border-l-4" style="border-left-color: {objective.color}">
									<!-- チェックボックス -->
									{#if isAuthenticated}
									<form method="POST" action="?/toggleObjective" use:enhance>
										<input type="hidden" name="objective_id" value={objective.id} />
										<input type="hidden" name="is_completed" value={objective.is_completed} />
										<button type="submit" class="w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all hover:scale-110" style="border-color: {objective.color}; {objective.is_completed ? `background-color: ${objective.color}` : ''}">
											{#if objective.is_completed}
												<svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
											{/if}
										</button>
									</form>
									{:else}
									<div class="w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0" style="border-color: {objective.color}; {objective.is_completed ? `background-color: ${objective.color}` : ''}">
										{#if objective.is_completed}
											<svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
										{/if}
									</div>
									{/if}
									<!-- タイトル・期限 -->
									<div class="flex-1 min-w-0">
										{#if isAuthenticated}
											<button type="button" class="block w-full text-left text-base font-medium {objective.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'}" onclick={() => { editingObjective = objective; showObjectiveModal = true; }}>{objective.title}</button>
										{:else}
											<span class="block text-base font-medium {objective.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'}">{objective.title}</span>
										{/if}
										{#if objective.due_date}
											<span class="text-sm mt-1 block" style="color: {objective.color}">{formatDate(objective.due_date)}</span>
										{/if}
									</div>
									<!-- アクションボタン -->
									{#if isAuthenticated}
									<div class="flex items-center gap-2 shrink-0">
										<!-- チェック作成ボタン -->
										<button type="button" onclick={() => { selectedObjectiveForCheck = objective; showCreateCheckFromObjectiveModal = true; newCheckFromObjectiveTitle = `${objective.title}のチェック`; }} class="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all" title="チェック作成">
											<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
											<span class="hidden sm:inline">チェック</span>
										</button>
										<!-- 編集ボタン -->
										<button type="button" onclick={() => { editingObjective = objective; showObjectiveModal = true; }} class="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all" title="編集">
											<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
											<span class="hidden sm:inline">編集</span>
										</button>
									</div>
									{/if}
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-center py-3 text-sm text-slate-400">{isAuthenticated ? '目標を追加してください' : '目標はありません'}</p>
					{/if}
				</div>
			</div>
			{/if}

			<!-- Row 2: ドキュメント一覧 (カード形式) -->
			{#if !expandedTile || expandedTile === 'checks'}
			<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden {expandedTile === 'checks' ? 'ring-2 ring-blue-500' : ''}">
				<div class="px-4 sm:px-6 py-3 border-b border-slate-100 flex items-center justify-between">
					<h2 class="font-semibold text-slate-900 text-sm sm:text-base flex items-center gap-2">
						📋 ドキュメント一覧
						<span class="text-xs font-normal text-slate-500">{data.goal.reviews.length}</span>
					</h2>
					<div class="flex items-center gap-2">
						{#if isAuthenticated}
							<button type="button" onclick={() => showCreateCheckModal = true} class="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700">+ 新規作成</button>
						{/if}
						<button type="button" onclick={() => toggleExpand('checks')} class="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600" title={expandedTile === 'checks' ? '縮小' : '拡大'}>
							{#if expandedTile === 'checks'}
								<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
							{:else}
								<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
							{/if}
						</button>
					</div>
				</div>
				{#if data.goal.reviews.length > 0}
					<div class="p-2 sm:p-3 space-y-2">
						{#each data.goal.reviews as review}
							<div class="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
								<!-- 絵文字アイコン -->
								<span class="text-xl shrink-0">{review.emoji || '📄'}</span>
								<!-- タイトル・情報 -->
								<div class="flex-1 min-w-0">
									<a href={isAuthenticated ? `/reviews/${review.id}` : (review.public_token ? `/p/${review.public_token}` : '#')} class="block text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline truncate">
										{review.title}
									</a>
									<div class="flex items-center gap-2 mt-1 flex-wrap">
										{#if review.objective_id}
											<span class="px-2 py-0.5 text-xs font-bold rounded-full" style="background-color: {review.objective_color}; color: white">
												{review.objective_title}
											</span>
										{/if}
										<span class="px-2 py-0.5 text-xs rounded-full {checkStatusColors[review.status] || checkStatusColors.draft}">{checkStatusLabels[review.status] || '下書き'}</span>
										<span class="text-xs text-slate-400">{review.requester_name || ''}</span>
										{#if review.due_date}
											<span class="text-xs text-slate-400">{formatDate(review.due_date)}</span>
										{/if}
									</div>
								</div>
								<!-- アクションボタン -->
								{#if isAuthenticated}
								<div class="flex items-center gap-1.5 shrink-0">
									{#if review.status !== 'approved'}
										<a
											href="/reviews/{review.id}"
											class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
											title="編集"
										>
											<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											</svg>
										</a>
									{:else}
										<span class="p-1.5 text-slate-300 cursor-not-allowed" title="確認済みのため編集できません">
											<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
											</svg>
										</span>
									{/if}
									<button
										type="button"
										onclick={() => generateShareUrl(review.id)}
										disabled={loadingId === review.id}
										class="p-1.5 rounded-lg transition-colors {copiedId === review.id ? 'bg-green-100 text-green-700' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}"
										title="共有リンクをコピー"
									>
										{#if loadingId === review.id}
											<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
												<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
												<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
											</svg>
										{:else if copiedId === review.id}
											<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
											</svg>
										{:else}
											<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
											</svg>
										{/if}
									</button>
									<button
										type="button"
										onclick={() => openNotifyModal(review.id, review.title)}
										class="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
										title="確認依頼メール"
									>
										<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
										</svg>
									</button>
									<button
										type="button"
										onclick={() => deleteReviewFromList(review.id, review.title)}
										disabled={deletingId === review.id}
										class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
										title="削除"
									>
										{#if deletingId === review.id}
											<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
												<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
												<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
											</svg>
										{:else}
											<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
											</svg>
										{/if}
									</button>
								</div>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-center py-8 text-sm text-slate-400">{isAuthenticated ? 'ドキュメントがありません' : 'ドキュメントはありません'}</p>
				{/if}
			</div>
			{/if}

			<!-- Row 3: カレンダー | タスク (横並び or 拡大時は単独) -->
			<div class="grid grid-cols-1 {!expandedTile ? 'md:grid-cols-2' : ''} gap-3 sm:gap-4">
				<!-- カレンダー -->
				{#if !expandedTile || expandedTile === 'calendar'}
				<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden {expandedTile === 'calendar' ? 'ring-2 ring-blue-500' : ''}">
					<div class="px-3 sm:px-4 py-2 border-b border-slate-100 flex items-center justify-between">
						<h2 class="font-semibold text-slate-900 text-sm sm:text-base">📅 カレンダー</h2>
						<div class="flex items-center gap-1 sm:gap-2">
							<button type="button" class="p-1 hover:bg-slate-100 rounded" onclick={() => navigateMonth(-1)} aria-label="前月">
								<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
							</button>
							<span class="text-xs sm:text-sm font-medium min-w-[80px] text-center">{calendarYear}年{monthNames[calendarMonth]}</span>
							<button type="button" class="p-1 hover:bg-slate-100 rounded" onclick={() => navigateMonth(1)} aria-label="次月">
								<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
							</button>
							<button type="button" onclick={() => toggleExpand('calendar')} class="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 ml-1" title={expandedTile === 'calendar' ? '縮小' : '拡大'}>
								{#if expandedTile === 'calendar'}
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
								{:else}
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
								{/if}
							</button>
						</div>
					</div>
					<div class="p-2 {expandedTile === 'calendar' ? 'p-4' : ''}">
						<div class="grid grid-cols-7 gap-px text-center text-xs mb-1">
							{#each weekDays as day}
								<div class="py-0.5 text-slate-500 font-medium">{day}</div>
							{/each}
						</div>
						<div class="grid grid-cols-7 gap-px">
							{#each calendarDays as date}
								{@const items = getItemsForDate(date)}
								{@const hasItems = items.tasks.length > 0 || items.objectives.length > 0}
								<div class="{expandedTile === 'calendar' ? 'min-h-[80px] p-1' : 'aspect-square p-0.5'} text-xs {isCurrentMonth(date) ? '' : 'opacity-30'} {isToday(date) ? 'bg-blue-50 rounded' : ''} hover:bg-slate-50 transition-colors {isAuthenticated ? 'cursor-pointer' : ''} border border-transparent hover:border-slate-200 rounded" onclick={() => { if (isAuthenticated && isCurrentMonth(date)) { const dateStr = date.toISOString().split('T')[0]; showAddTaskModal = true; editingTask = { due_date: dateStr }; } }}>
									<div class="font-medium text-center {isToday(date) ? 'text-blue-600' : 'text-slate-700'}">{date.getDate()}</div>
									{#if hasItems}
										{#if expandedTile === 'calendar'}
											<!-- 拡大時: アイテム名も表示 -->
											<div class="mt-1 space-y-0.5">
												{#each items.objectives.slice(0, 3) as obj}
													<div class="truncate text-xs px-1 py-0.5 rounded" style="background-color: {obj.color}20; color: {obj.color}">
														{obj.title}
													</div>
												{/each}
												{#each items.tasks.slice(0, 3) as task}
													<div class="truncate text-xs px-1 py-0.5 rounded bg-blue-50 text-blue-600">
														{task.title}
													</div>
												{/each}
											</div>
										{:else}
											<!-- 通常時: ドットのみ -->
											<div class="flex justify-center gap-0.5 mt-0.5">
												{#each items.objectives.slice(0, 2) as obj}
													<div class="w-1.5 h-1.5 rounded-full" style="background-color: {obj.color}"></div>
												{/each}
												{#each items.tasks.slice(0, 2) as task}
													<div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
												{/each}
											</div>
										{/if}
									{/if}
								</div>
							{/each}
						</div>
						<!-- 凡例 -->
						{#if expandedTile === 'calendar'}
							<div class="mt-4 pt-3 border-t border-slate-100">
								<div class="flex items-center gap-4 text-xs text-slate-500">
									<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-blue-500"></span> タスク</span>
									{#each objectiveColors.slice(0, 4) as color}
										<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full" style="background-color: {color.value}"></span></span>
									{/each}
									<span>目標</span>
								</div>
							</div>
						{/if}
					</div>
				</div>
				{/if}

				<!-- タスク -->
				{#if !expandedTile || expandedTile === 'tasks'}
				<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden {expandedTile === 'tasks' ? 'ring-2 ring-blue-500' : ''}">
					<div class="px-3 sm:px-4 py-2 border-b border-slate-100 flex items-center justify-between">
						<h2 class="font-semibold text-slate-900 text-sm sm:text-base flex items-center gap-2">
							✅ タスク
							<span class="text-xs font-normal text-slate-500">{taskProgress.completed}/{taskProgress.total}</span>
						</h2>
						<div class="flex items-center gap-2">
							{#if isAuthenticated}
								<button type="button" onclick={() => { showAddTaskModal = true; editingTask = null; }} class="text-xs text-blue-600 hover:text-blue-700 font-medium">+ 新規</button>
							{/if}
							<button type="button" onclick={() => toggleExpand('tasks')} class="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600" title={expandedTile === 'tasks' ? '縮小' : '拡大'}>
								{#if expandedTile === 'tasks'}
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
								{:else}
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
								{/if}
							</button>
						</div>
					</div>
					<div class="p-2">
						<div class="grid grid-cols-3 gap-1.5 sm:gap-2">
							{#each ['pending', 'in_progress', 'completed'] as status}
								<div class="rounded-lg {taskStatusColors[status]} border p-1 sm:p-1.5">
									<div class="flex items-center justify-between mb-1 px-0.5">
										<h3 class="font-medium text-slate-700 text-xs truncate">{taskStatusLabels[status]}</h3>
										<span class="text-xs text-slate-500">{tasksByStatus[status as keyof typeof tasksByStatus].length}</span>
									</div>
									{#if isAuthenticated}
									<div class="space-y-1 min-h-[80px]" use:dndzone={{ items: tasksByStatus[status as keyof typeof tasksByStatus], flipDurationMs, dropTargetStyle: { outline: '2px dashed #3b82f6', outlineOffset: '1px', borderRadius: '4px' }, type: 'tasks' }} onconsider={(e) => handleDndConsider(status, e)} onfinalize={(e) => handleDndFinalize(status, e)}>
										{#each tasksByStatus[status as keyof typeof tasksByStatus] as task (task.id)}
											<div class="bg-white rounded p-1.5 shadow-sm cursor-grab active:cursor-grabbing text-xs" animate:flip={{ duration: flipDurationMs }}>
												<button type="button" class="w-full text-left" onclick={() => { editingTask = task; showAddTaskModal = true; }}>
													<div class="font-medium text-slate-900 line-clamp-2">{task.title}</div>
													{#if task.due_date}
														<div class="text-slate-500 mt-0.5 text-xs">{formatDate(task.due_date)}</div>
													{/if}
												</button>
											</div>
										{/each}
									</div>
									{:else}
									<div class="space-y-1 min-h-[80px]">
										{#each tasksByStatus[status as keyof typeof tasksByStatus] as task (task.id)}
											<div class="bg-white rounded p-1.5 shadow-sm text-xs">
												<div class="font-medium text-slate-900 line-clamp-2">{task.title}</div>
												{#if task.due_date}
													<div class="text-slate-500 mt-0.5 text-xs">{formatDate(task.due_date)}</div>
												{/if}
											</div>
										{/each}
									</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Modals (only when authenticated) -->
	{#if isAuthenticated}
	<!-- Edit Project Modal -->
	{#if showEditProject}
		<div class="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4" onclick={() => showEditProject = false}>
			<div class="bg-white rounded-2xl shadow-xl max-w-lg w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
				<h3 class="text-lg font-bold text-slate-900 mb-4">プロジェクト設定</h3>
				<form method="POST" action="?/update" use:enhance={() => { return async ({ update }) => { showEditProject = false; await update(); }; }} class="space-y-4">
					<div>
						<label for="title" class="block text-sm font-medium text-slate-700 mb-1">プロジェクト名</label>
						<input type="text" id="title" name="title" value={data.goal.title} required class="w-full px-3 py-2 border border-slate-300 rounded-lg" />
					</div>
					<div>
						<label for="description" class="block text-sm font-medium text-slate-700 mb-1">説明</label>
						<textarea id="description" name="description" rows="2" class="w-full px-3 py-2 border border-slate-300 rounded-lg">{data.goal.description || ''}</textarea>
					</div>
					<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<div>
							<label for="due_date" class="block text-sm font-medium text-slate-700 mb-1">期限</label>
							<input type="date" id="due_date" name="due_date" value={formatDateForInput(data.goal.due_date)} required class="w-full px-3 py-2 border border-slate-300 rounded-lg" />
						</div>
						<div>
							<label for="priority" class="block text-sm font-medium text-slate-700 mb-1">優先度</label>
							<select id="priority" name="priority" class="w-full px-3 py-2 border border-slate-300 rounded-lg">
								<option value="low" selected={data.goal.priority === 'low'}>低</option>
								<option value="medium" selected={data.goal.priority === 'medium'}>中</option>
								<option value="high" selected={data.goal.priority === 'high'}>高</option>
							</select>
						</div>
						<div>
							<label for="status" class="block text-sm font-medium text-slate-700 mb-1">ステータス</label>
							<select id="status" name="status" class="w-full px-3 py-2 border border-slate-300 rounded-lg">
								<option value="pending" selected={data.goal.status === 'pending'}>未着手</option>
								<option value="in_progress" selected={data.goal.status === 'in_progress'}>進行中</option>
								<option value="completed" selected={data.goal.status === 'completed'}>完了</option>
								<option value="on_hold" selected={data.goal.status === 'on_hold'}>保留</option>
							</select>
						</div>
					</div>
					<div>
						<label class="block text-sm font-medium text-slate-700 mb-2">カラー</label>
						<div class="flex gap-2 flex-wrap">
							{#each colors as color}
								<label class="cursor-pointer">
									<input type="radio" name="color" value={color.value} class="sr-only" checked={selectedColor === color.value} onchange={() => selectedColor = color.value} />
									<div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-all {selectedColor === color.value ? 'border-slate-900 scale-110' : 'border-transparent'}" style="background-color: {color.value}"></div>
								</label>
							{/each}
						</div>
					</div>
					<div>
						<label class="block text-sm font-medium text-slate-700 mb-2">担当者</label>
						<div class="flex flex-wrap gap-2">
							{#each data.allUsers as user}
								<label class="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-full text-sm border {data.goal.assignees.some((a: { id: string }) => a.id === user.id) ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200'}">
									<input type="checkbox" name="assignees" value={user.id} checked={data.goal.assignees.some((a: { id: string }) => a.id === user.id)} class="sr-only" />
									{user.name}
								</label>
							{/each}
						</div>
					</div>
					<div class="flex items-center justify-end gap-3 pt-4 border-t">
						<button type="button" class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg" onclick={() => showEditProject = false}>キャンセル</button>
						<button type="submit" class="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">保存</button>
					</div>
				</form>
				<form method="POST" action="?/delete" class="mt-4 pt-4 border-t">
					<button type="submit" class="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200" onclick={(e) => { if (!confirm('このプロジェクトを削除しますか？')) e.preventDefault(); }}>プロジェクトを削除</button>
				</form>
			</div>
		</div>
	{/if}

	<!-- Task Modal -->
	{#if showAddTaskModal}
		<div class="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4" onclick={() => showAddTaskModal = false}>
			<div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-4 sm:p-6" onclick={(e) => e.stopPropagation()}>
				<h3 class="text-lg font-bold text-slate-900 mb-4">{editingTask ? 'タスク編集' : '新規タスク'}</h3>
				<form method="POST" action={editingTask ? '?/updateTask' : '?/addTask'} use:enhance={() => { return async ({ update }) => { showAddTaskModal = false; await update(); }; }}>
					{#if editingTask}<input type="hidden" name="task_id" value={editingTask.id} />{/if}
					<div class="space-y-4">
						<div>
							<label for="task_title" class="block text-sm font-medium text-slate-700 mb-1">タスク名</label>
							<input type="text" id="task_title" name="title" value={editingTask?.title || ''} required class="w-full px-3 py-2 border border-slate-300 rounded-lg" />
						</div>
						<div>
							<label for="task_desc" class="block text-sm font-medium text-slate-700 mb-1">説明</label>
							<textarea id="task_desc" name="description" rows="2" class="w-full px-3 py-2 border border-slate-300 rounded-lg">{editingTask?.description || ''}</textarea>
						</div>
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label for="task_due" class="block text-sm font-medium text-slate-700 mb-1">期限</label>
								<input type="date" id="task_due" name="due_date" value={editingTask?.due_date ? formatDateForInput(editingTask.due_date) : ''} class="w-full px-3 py-2 border border-slate-300 rounded-lg" />
							</div>
							<div>
								<label for="task_status" class="block text-sm font-medium text-slate-700 mb-1">ステータス</label>
								<select id="task_status" name="status" class="w-full px-3 py-2 border border-slate-300 rounded-lg">
									<option value="pending" selected={!editingTask || editingTask.status === 'pending'}>未着手</option>
									<option value="in_progress" selected={editingTask?.status === 'in_progress'}>進行中</option>
									<option value="completed" selected={editingTask?.status === 'completed'}>完了</option>
								</select>
							</div>
						</div>
					</div>
					<div class="flex justify-end gap-3 mt-6">
						<button type="button" class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg" onclick={() => showAddTaskModal = false}>キャンセル</button>
						<button type="submit" class="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">{editingTask ? '更新' : '追加'}</button>
					</div>
				</form>
				{#if editingTask}
					<form method="POST" action="?/deleteTask" use:enhance={() => { return async ({ update }) => { showAddTaskModal = false; editingTask = null; await update(); }; }} class="mt-4 pt-4 border-t">
						<input type="hidden" name="task_id" value={editingTask.id} />
						<button type="submit" class="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200" onclick={(e) => { if (!confirm('削除しますか？')) e.preventDefault(); }}>タスクを削除</button>
					</form>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Create Check Modal -->
	{#if showCreateCheckModal}
		<div class="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4" onclick={() => showCreateCheckModal = false}>
			<div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-4 sm:p-6" onclick={(e) => e.stopPropagation()}>
				<h3 class="text-lg font-bold text-slate-900 mb-4">新規チェック</h3>
				<form method="POST" action="?/createReview" use:enhance>
					<div class="space-y-4">
						<div>
							<label for="check_title" class="block text-sm font-medium text-slate-700 mb-1">タイトル</label>
							<input type="text" id="check_title" name="title" bind:value={newCheckTitle} required class="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="チェックタイトル" />
						</div>
					</div>
					<div class="flex justify-end gap-3 mt-6">
						<button type="button" class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg" onclick={() => showCreateCheckModal = false}>キャンセル</button>
						<button type="submit" class="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">作成</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Objective Edit Modal -->
	{#if showObjectiveModal && editingObjective}
		<div class="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4" onclick={() => showObjectiveModal = false}>
			<div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-4 sm:p-6" onclick={(e) => e.stopPropagation()}>
				<h3 class="text-lg font-bold text-slate-900 mb-4">目標編集</h3>
				<form method="POST" action="?/updateObjective" use:enhance={() => { return async ({ update }) => { showObjectiveModal = false; editingObjective = null; await update(); }; }}>
					<input type="hidden" name="objective_id" value={editingObjective.id} />
					<input type="hidden" name="color" id="edit_obj_color" value={editingObjective.color || '#3b82f6'} />
					<div class="space-y-4">
						<div>
							<label for="obj_title" class="block text-sm font-medium text-slate-700 mb-1">目標</label>
							<input type="text" id="obj_title" name="title" value={editingObjective.title} required class="w-full px-3 py-2 border border-slate-300 rounded-lg" />
						</div>
						<div>
							<label for="obj_due" class="block text-sm font-medium text-slate-700 mb-1">期限</label>
							<input type="date" id="obj_due" name="due_date" value={editingObjective.due_date ? formatDateForInput(editingObjective.due_date) : ''} class="w-full px-3 py-2 border border-slate-300 rounded-lg" />
						</div>
						<div>
							<label class="block text-sm font-medium text-slate-700 mb-2">色</label>
							<div class="flex gap-2 flex-wrap">
								{#each objectiveColors as color}
									<button type="button" onclick={() => { editingObjective.color = color.value; const input = document.getElementById('edit_obj_color') as HTMLInputElement; if(input) input.value = color.value; }} class="w-7 h-7 rounded-full border-2 transition-all {editingObjective.color === color.value ? 'border-slate-900 scale-110' : 'border-transparent hover:scale-105'}" style="background-color: {color.value}"></button>
								{/each}
							</div>
						</div>
					</div>
					<div class="flex justify-end gap-3 mt-6">
						<button type="button" class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg" onclick={() => showObjectiveModal = false}>キャンセル</button>
						<button type="submit" class="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">更新</button>
					</div>
				</form>
				<form method="POST" action="?/deleteObjective" use:enhance={() => { return async ({ update }) => { showObjectiveModal = false; editingObjective = null; await update(); }; }} class="mt-4 pt-4 border-t">
					<input type="hidden" name="objective_id" value={editingObjective.id} />
					<button type="submit" class="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200" onclick={(e) => { if (!confirm('この目標を削除しますか？')) e.preventDefault(); }}>目標を削除</button>
				</form>
			</div>
		</div>
	{/if}

	<!-- Create Check from Objective Modal -->
	{#if showCreateCheckFromObjectiveModal && selectedObjectiveForCheck}
		<div class="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4" onclick={() => showCreateCheckFromObjectiveModal = false}>
			<div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-4 sm:p-6" onclick={(e) => e.stopPropagation()}>
				<h3 class="text-lg font-bold text-slate-900 mb-2">チェックを作成</h3>
				<p class="text-sm text-slate-500 mb-4">
					目標「<span class="font-medium" style="color: {selectedObjectiveForCheck.color}">{selectedObjectiveForCheck.title}</span>」に紐付け
				</p>
				<form method="POST" action="?/createReviewFromObjective" use:enhance={() => { return async ({ result }) => { showCreateCheckFromObjectiveModal = false; selectedObjectiveForCheck = null; }; }}>
					<input type="hidden" name="objective_id" value={selectedObjectiveForCheck.id} />
					<div class="space-y-4">
						<div>
							<label for="check_obj_title" class="block text-sm font-medium text-slate-700 mb-1">チェックタイトル</label>
							<input type="text" id="check_obj_title" name="title" bind:value={newCheckFromObjectiveTitle} required class="w-full px-3 py-2 border border-slate-300 rounded-lg" />
						</div>
					</div>
					<div class="flex justify-end gap-3 mt-6">
						<button type="button" class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg" onclick={() => showCreateCheckFromObjectiveModal = false}>キャンセル</button>
						<button type="submit" class="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">作成</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Notify Modal (same as /reviews) -->
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
	{/if}
{/snippet}
