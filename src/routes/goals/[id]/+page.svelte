<script lang="ts">
	import AppLayout from '$lib/components/AppLayout.svelte';
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Drag and drop configuration
	const flipDurationMs = 200;

	const statusLabels: Record<string, string> = {
		pending: '未着手',
		in_progress: '進行中',
		completed: '完了',
		on_hold: '保留'
	};

	const taskStatusLabels: Record<string, string> = {
		pending: '未着手',
		in_progress: '進行中',
		completed: '完了'
	};

	const taskStatusColors: Record<string, string> = {
		pending: 'bg-slate-100 border-slate-300',
		in_progress: 'bg-blue-50 border-blue-300',
		completed: 'bg-green-50 border-green-300'
	};

	const colors = [
		{ value: '#3b82f6', name: '青' },
		{ value: '#ef4444', name: '赤' },
		{ value: '#10b981', name: '緑' },
		{ value: '#f59e0b', name: '黄' },
		{ value: '#8b5cf6', name: '紫' },
		{ value: '#ec4899', name: 'ピンク' },
		{ value: '#06b6d4', name: 'シアン' },
		{ value: '#6b7280', name: 'グレー' }
	];

	let isEditing = $state(false);
	let showLinkModal = $state(false);
	let showAddTaskModal = $state(false);
	let editingTask = $state<any>(null);
	let selectedColor = $state(data.goal.color);
	let viewMode = $state<'board' | 'calendar'>('board');

	// Calendar state
	let calendarMonth = $state(new Date().getMonth());
	let calendarYear = $state(new Date().getFullYear());

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function formatDateForInput(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toISOString().split('T')[0];
	}

	function getProgress(): number {
		const total = data.goal.tasks.length;
		if (total === 0) return 0;
		const completed = data.goal.tasks.filter((t: { status: string }) => t.status === 'completed').length;
		return Math.round((completed / total) * 100);
	}

	// Task type for drag and drop
	interface Task {
		id: string;
		title: string;
		description?: string;
		due_date?: string;
		status: string;
		sort_order: number;
	}

	// Reactive task lists for each column
	function getTasksByStatus() {
		return {
			pending: data.goal.tasks.filter((t: Task) => t.status === 'pending').map((t: Task) => ({ ...t })),
			in_progress: data.goal.tasks.filter((t: Task) => t.status === 'in_progress').map((t: Task) => ({ ...t })),
			completed: data.goal.tasks.filter((t: Task) => t.status === 'completed').map((t: Task) => ({ ...t }))
		};
	}

	let tasksByStatus = $state(getTasksByStatus());

	// Update tasksByStatus when data changes
	$effect(() => {
		const _ = data.goal.tasks;
		tasksByStatus = getTasksByStatus();
	});

	// Drag and drop handlers
	function handleDndConsider(status: string, e: CustomEvent<{ items: Task[] }>) {
		tasksByStatus[status as keyof typeof tasksByStatus] = e.detail.items;
	}

	async function handleDndFinalize(status: string, e: CustomEvent<{ items: Task[] }>) {
		const newItems = e.detail.items;
		tasksByStatus[status as keyof typeof tasksByStatus] = newItems;

		// Save to server
		const tasksToUpdate = newItems.map((task, index) => ({
			id: task.id,
			status: status,
			sort_order: index
		}));

		if (tasksToUpdate.length > 0) {
			const formData = new FormData();
			formData.append('tasks', JSON.stringify(tasksToUpdate));

			try {
				await fetch('?/reorderTasks', {
					method: 'POST',
					body: formData
				});
				await invalidateAll();
			} catch (error) {
				console.error('Error saving task order:', error);
				await invalidateAll();
			}
		}
	}

	// Calendar helpers
	const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
	const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

	function getDaysInMonth(year: number, month: number): Date[] {
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const days: Date[] = [];

		const startPadding = firstDay.getDay();
		for (let i = startPadding - 1; i >= 0; i--) {
			days.push(new Date(year, month, -i));
		}

		for (let i = 1; i <= lastDay.getDate(); i++) {
			days.push(new Date(year, month, i));
		}

		const endPadding = 6 - lastDay.getDay();
		for (let i = 1; i <= endPadding; i++) {
			days.push(new Date(year, month + 1, i));
		}

		return days;
	}

	function isCurrentMonth(date: Date): boolean {
		return date.getMonth() === calendarMonth;
	}

	function isToday(date: Date): boolean {
		const today = new Date();
		return date.toDateString() === today.toDateString();
	}

	function getTasksForDate(date: Date): any[] {
		const dateStr = date.toISOString().split('T')[0];
		return data.goal.tasks.filter((task: { due_date: string }) => {
			if (!task.due_date) return false;
			const taskDate = new Date(task.due_date).toISOString().split('T')[0];
			return taskDate === dateStr;
		});
	}

	function navigateMonth(direction: number) {
		calendarMonth += direction;
		if (calendarMonth < 0) {
			calendarMonth = 11;
			calendarYear--;
		} else if (calendarMonth > 11) {
			calendarMonth = 0;
			calendarYear++;
		}
	}

	const calendarDays = $derived(getDaysInMonth(calendarYear, calendarMonth));

	const linkedReviewIds = $derived(new Set(data.goal.reviews.map((r: { id: string }) => r.id)));
</script>

<AppLayout user={data.user}>
	<div class="max-w-6xl mx-auto px-4 sm:px-0">
		<div class="mb-6">
			<a href="/goals" class="text-blue-600 hover:underline text-sm">
				&larr; プロジェクト一覧に戻る
			</a>
		</div>

		{#if form?.error}
			<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
				{form.error}
			</div>
		{/if}

		{#if form?.success}
			<div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
				更新しました
			</div>
		{/if}

		<!-- Project Header -->
		<div class="bg-white shadow rounded-lg p-6 mb-6 border-l-4" style="border-left-color: {data.goal.color}">
			{#if isEditing}
				<form method="POST" action="?/update" class="space-y-4">
					<div>
						<label for="title" class="block text-sm font-medium text-gray-700 mb-1">プロジェクト名</label>
						<input
							type="text"
							id="title"
							name="title"
							value={data.goal.title}
							required
							class="block w-full px-3 py-2 border border-gray-300 rounded-md"
						/>
					</div>

					<div>
						<label for="description" class="block text-sm font-medium text-gray-700 mb-1">説明</label>
						<textarea
							id="description"
							name="description"
							rows="2"
							class="block w-full px-3 py-2 border border-gray-300 rounded-md"
						>{data.goal.description || ''}</textarea>
					</div>

					<div class="grid grid-cols-3 gap-4">
						<div>
							<label for="due_date" class="block text-sm font-medium text-gray-700 mb-1">期限</label>
							<input
								type="date"
								id="due_date"
								name="due_date"
								value={formatDateForInput(data.goal.due_date)}
								required
								class="block w-full px-3 py-2 border border-gray-300 rounded-md"
							/>
						</div>
						<div>
							<label for="priority" class="block text-sm font-medium text-gray-700 mb-1">優先度</label>
							<select id="priority" name="priority" class="block w-full px-3 py-2 border border-gray-300 rounded-md">
								<option value="low" selected={data.goal.priority === 'low'}>低</option>
								<option value="medium" selected={data.goal.priority === 'medium'}>中</option>
								<option value="high" selected={data.goal.priority === 'high'}>高</option>
							</select>
						</div>
						<div>
							<label for="status" class="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
							<select id="status" name="status" class="block w-full px-3 py-2 border border-gray-300 rounded-md">
								<option value="pending" selected={data.goal.status === 'pending'}>未着手</option>
								<option value="in_progress" selected={data.goal.status === 'in_progress'}>進行中</option>
								<option value="completed" selected={data.goal.status === 'completed'}>完了</option>
								<option value="on_hold" selected={data.goal.status === 'on_hold'}>保留</option>
							</select>
						</div>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">カラー</label>
						<div class="flex gap-2">
							{#each colors as color}
								<label class="cursor-pointer">
									<input type="radio" name="color" value={color.value} class="sr-only" checked={selectedColor === color.value} onchange={() => selectedColor = color.value} />
									<div class="w-8 h-8 rounded-full border-2 transition-all {selectedColor === color.value ? 'border-gray-900 scale-110' : 'border-transparent'}" style="background-color: {color.value}"></div>
								</label>
							{/each}
						</div>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">担当者</label>
						<div class="flex flex-wrap gap-2">
							{#each data.allUsers as user}
								<label class="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-full text-sm border {data.goal.assignees.some((a: { id: string }) => a.id === user.id) ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'}">
									<input type="checkbox" name="assignees" value={user.id} checked={data.goal.assignees.some((a: { id: string }) => a.id === user.id)} class="sr-only" />
									<span>{user.name}</span>
								</label>
							{/each}
						</div>
					</div>

					<div class="flex justify-end gap-3 pt-4 border-t">
						<button type="button" class="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50" onclick={() => isEditing = false}>キャンセル</button>
						<button type="submit" class="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">保存</button>
					</div>
				</form>
			{:else}
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<div class="flex items-center gap-3 mb-2">
							<h1 class="text-2xl font-bold text-gray-900">{data.goal.title}</h1>
							<span class="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">{statusLabels[data.goal.status]}</span>
						</div>
						{#if data.goal.description}
							<p class="text-gray-600 mb-3">{data.goal.description}</p>
						{/if}
						<div class="flex flex-wrap gap-4 text-sm text-gray-500">
							<span>期限: {formatDate(data.goal.due_date)}</span>
							<span>作成: {data.goal.creator_name}</span>
							{#if data.goal.assignees.length > 0}
								<span>担当: {data.goal.assignees.map((a: { name: string }) => a.name).join(', ')}</span>
							{/if}
						</div>
					</div>
					<div class="ml-6 text-center">
						<div class="text-3xl font-bold" style="color: {data.goal.color}">{getProgress()}%</div>
						<div class="text-xs text-gray-500 mb-2">タスク進捗</div>
						<div class="w-24 h-2 bg-gray-200 rounded-full">
							<div class="h-2 rounded-full" style="width: {getProgress()}%; background-color: {data.goal.color}"></div>
						</div>
						<div class="mt-3 flex gap-2">
							<button type="button" class="px-3 py-1 text-xs text-gray-600 border rounded hover:bg-gray-50" onclick={() => isEditing = true}>編集</button>
							<form method="POST" action="?/delete" class="inline">
								<button type="submit" class="px-3 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50" onclick={(e) => { if (!confirm('削除しますか？')) e.preventDefault(); }}>削除</button>
							</form>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- View Toggle & Add Task -->
		<div class="flex items-center justify-between mb-4">
			<div class="flex bg-gray-100 rounded-lg p-1">
				<button type="button" class="px-4 py-2 text-sm rounded-md transition-colors {viewMode === 'board' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}" onclick={() => viewMode = 'board'}>
					ボード
				</button>
				<button type="button" class="px-4 py-2 text-sm rounded-md transition-colors {viewMode === 'calendar' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}" onclick={() => viewMode = 'calendar'}>
					カレンダー
				</button>
			</div>
			<button type="button" class="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2" onclick={() => { showAddTaskModal = true; editingTask = null; }}>
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				タスク追加
			</button>
		</div>

		<!-- Board View -->
		{#if viewMode === 'board'}
			<div class="grid grid-cols-3 gap-4">
				{#each ['pending', 'in_progress', 'completed'] as status}
					<div class="bg-gray-50 rounded-lg p-4">
						<div class="flex items-center justify-between mb-3">
							<h3 class="font-semibold text-gray-700">{taskStatusLabels[status]}</h3>
							<span class="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">{tasksByStatus[status as keyof typeof tasksByStatus].length}</span>
						</div>
						<div
							class="space-y-2 min-h-32"
							use:dndzone={{
								items: tasksByStatus[status as keyof typeof tasksByStatus],
								flipDurationMs,
								dropTargetStyle: { outline: '2px dashed #3b82f6', outlineOffset: '2px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.1)' },
								type: 'tasks',
								dropFromOthersDisabled: false,
								centreDraggedOnCursor: true
							}}
							onconsider={(e) => handleDndConsider(status, e)}
							onfinalize={(e) => handleDndFinalize(status, e)}
						>
							{#each tasksByStatus[status as keyof typeof tasksByStatus] as task (task.id)}
								<div
									class="bg-white rounded-lg p-3 shadow-sm border {taskStatusColors[status]} cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
									animate:flip={{ duration: flipDurationMs }}
								>
									<button type="button" class="w-full text-left" onclick={() => { editingTask = task; showAddTaskModal = true; }}>
										<div class="font-medium text-gray-900 mb-1">{task.title}</div>
										{#if task.due_date}
											<div class="text-xs text-gray-500 flex items-center gap-1">
												<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
												</svg>
												{formatDate(task.due_date)}
											</div>
										{/if}
										{#if task.description}
											<div class="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</div>
										{/if}
									</button>
									<!-- Quick move buttons -->
									<div class="flex gap-1 mt-2">
										{#if status !== 'pending'}
											<form method="POST" action="?/moveTask" use:enhance={() => { return async ({ update }) => { await update(); }; }}>
												<input type="hidden" name="task_id" value={task.id} />
												<input type="hidden" name="status" value="pending" />
												<button type="submit" class="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200" onclick={(e) => e.stopPropagation()}>← 未着手</button>
											</form>
										{/if}
										{#if status !== 'in_progress'}
											<form method="POST" action="?/moveTask" use:enhance={() => { return async ({ update }) => { await update(); }; }}>
												<input type="hidden" name="task_id" value={task.id} />
												<input type="hidden" name="status" value="in_progress" />
												<button type="submit" class="px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200" onclick={(e) => e.stopPropagation()}>進行中</button>
											</form>
										{/if}
										{#if status !== 'completed'}
											<form method="POST" action="?/moveTask" use:enhance={() => { return async ({ update }) => { await update(); }; }}>
												<input type="hidden" name="task_id" value={task.id} />
												<input type="hidden" name="status" value="completed" />
												<button type="submit" class="px-2 py-0.5 text-xs bg-green-100 text-green-600 rounded hover:bg-green-200" onclick={(e) => e.stopPropagation()}>完了 →</button>
											</form>
										{/if}
									</div>
								</div>
							{:else}
								<div class="text-sm text-gray-400 text-center py-8">ドラッグしてタスクを追加</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Calendar View -->
		{#if viewMode === 'calendar'}
			<div class="bg-white rounded-lg shadow">
				<!-- Calendar Header -->
				<div class="flex items-center justify-between px-4 py-3 border-b">
					<button type="button" class="p-2 hover:bg-gray-100 rounded" onclick={() => navigateMonth(-1)}>
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
						</svg>
					</button>
					<h3 class="text-lg font-semibold">{calendarYear}年 {monthNames[calendarMonth]}</h3>
					<button type="button" class="p-2 hover:bg-gray-100 rounded" onclick={() => navigateMonth(1)}>
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</button>
				</div>

				<!-- Week headers -->
				<div class="grid grid-cols-7 border-b">
					{#each weekDays as day, i}
						<div class="py-2 text-center text-sm font-medium {i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-700'}">{day}</div>
					{/each}
				</div>

				<!-- Calendar grid -->
				<div class="grid grid-cols-7">
					{#each calendarDays as date, i}
						{@const dayTasks = getTasksForDate(date)}
						<div class="min-h-24 p-1 border-b border-r {!isCurrentMonth(date) ? 'bg-gray-50' : ''} {i % 7 === 6 ? 'border-r-0' : ''}">
							<div class="flex justify-between items-start">
								<span class="text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full {isToday(date) ? 'bg-blue-600 text-white' : ''} {!isCurrentMonth(date) ? 'text-gray-400' : ''} {i % 7 === 0 && isCurrentMonth(date) && !isToday(date) ? 'text-red-500' : ''} {i % 7 === 6 && isCurrentMonth(date) && !isToday(date) ? 'text-blue-500' : ''}">
									{date.getDate()}
								</span>
							</div>
							<div class="mt-1 space-y-0.5">
								{#each dayTasks.slice(0, 3) as task}
									<button type="button" class="w-full text-left px-1.5 py-0.5 text-xs rounded truncate {task.status === 'completed' ? 'bg-green-100 text-green-700 line-through' : task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}" onclick={() => { editingTask = task; showAddTaskModal = true; }}>
										{task.title}
									</button>
								{/each}
								{#if dayTasks.length > 3}
									<div class="text-xs text-gray-500 px-1">+{dayTasks.length - 3}</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Related Reviews Section -->
		<div class="bg-white shadow rounded-lg p-6 mt-6">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-lg font-semibold text-gray-900">関連レビュー</h2>
				<button type="button" class="px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100" onclick={() => showLinkModal = true}>
					+ レビューをリンク
				</button>
			</div>

			{#if data.goal.reviews.length > 0}
				<div class="space-y-2">
					{#each data.goal.reviews as review}
						<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
							<a href="/reviews/{review.id}" class="text-blue-600 hover:underline font-medium">{review.title}</a>
							<form method="POST" action="?/unlinkReview" class="inline">
								<input type="hidden" name="review_id" value={review.id} />
								<button type="submit" class="text-gray-400 hover:text-red-500">
									<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</form>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-gray-500 text-center py-4">関連レビューなし</p>
			{/if}
		</div>
	</div>

	<!-- Add/Edit Task Modal -->
	{#if showAddTaskModal}
		<div class="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4" onclick={() => showAddTaskModal = false}>
			<div class="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onclick={(e) => e.stopPropagation()}>
				<h3 class="text-lg font-semibold text-gray-900 mb-4">{editingTask ? 'タスク編集' : '新規タスク'}</h3>
				<form method="POST" action={editingTask ? '?/updateTask' : '?/addTask'} use:enhance={() => { return async ({ update }) => { showAddTaskModal = false; await update(); }; }}>
					{#if editingTask}
						<input type="hidden" name="task_id" value={editingTask.id} />
					{/if}
					<div class="space-y-4">
						<div>
							<label for="task_title" class="block text-sm font-medium text-gray-700 mb-1">タスク名</label>
							<input type="text" id="task_title" name="title" value={editingTask?.title || ''} required class="block w-full px-3 py-2 border border-gray-300 rounded-md" />
						</div>
						<div>
							<label for="task_desc" class="block text-sm font-medium text-gray-700 mb-1">説明</label>
							<textarea id="task_desc" name="description" rows="2" class="block w-full px-3 py-2 border border-gray-300 rounded-md">{editingTask?.description || ''}</textarea>
						</div>
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label for="task_due" class="block text-sm font-medium text-gray-700 mb-1">期限</label>
								<input type="date" id="task_due" name="due_date" value={editingTask?.due_date ? formatDateForInput(editingTask.due_date) : ''} class="block w-full px-3 py-2 border border-gray-300 rounded-md" />
							</div>
							<div>
								<label for="task_status" class="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
								<select id="task_status" name="status" class="block w-full px-3 py-2 border border-gray-300 rounded-md">
									<option value="pending" selected={!editingTask || editingTask.status === 'pending'}>未着手</option>
									<option value="in_progress" selected={editingTask?.status === 'in_progress'}>進行中</option>
									<option value="completed" selected={editingTask?.status === 'completed'}>完了</option>
								</select>
							</div>
						</div>
					</div>
					<div class="flex justify-between mt-6">
						{#if editingTask}
							<form method="POST" action="?/deleteTask" use:enhance={() => { return async ({ update }) => { showAddTaskModal = false; await update(); }; }}>
								<input type="hidden" name="task_id" value={editingTask.id} />
								<button type="submit" class="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md" onclick={(e) => { if (!confirm('削除しますか？')) e.preventDefault(); }}>削除</button>
							</form>
						{:else}
							<div></div>
						{/if}
						<div class="flex gap-3">
							<button type="button" class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md" onclick={() => showAddTaskModal = false}>キャンセル</button>
							<button type="submit" class="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">{editingTask ? '更新' : '作成'}</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Link Review Modal -->
	{#if showLinkModal}
		<div class="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4" onclick={() => showLinkModal = false}>
			<div class="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onclick={(e) => e.stopPropagation()}>
				<h3 class="text-lg font-semibold text-gray-900 mb-4">レビューをリンク</h3>
				<form method="POST" action="?/linkReview" use:enhance={() => { return async ({ update }) => { showLinkModal = false; await update(); }; }}>
					<select name="review_id" required class="block w-full px-3 py-2 border border-gray-300 rounded-md mb-4">
						<option value="">選択してください</option>
						{#each data.allReviews.filter((r: { id: string }) => !linkedReviewIds.has(r.id)) as review}
							<option value={review.id}>{review.title}</option>
						{/each}
					</select>
					<div class="flex justify-end gap-3">
						<button type="button" class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md" onclick={() => showLinkModal = false}>キャンセル</button>
						<button type="submit" class="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">リンク</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</AppLayout>
