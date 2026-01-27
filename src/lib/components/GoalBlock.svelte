<script lang="ts">
	interface Goal {
		id: string;
		title: string;
		due_date: string;
		status: string;
		color: string;
		completed_reviews?: number;
		total_reviews?: number;
	}

	interface Props {
		goal: Goal;
		showRemove?: boolean;
		onRemove?: () => void;
	}

	let { goal, showRemove = false, onRemove }: Props = $props();

	const statusLabels: Record<string, string> = {
		pending: '未着手',
		in_progress: '進行中',
		completed: '完了',
		on_hold: '保留'
	};

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function getProgress(): number {
		if (!goal.total_reviews || goal.total_reviews === 0) return 0;
		return Math.round(((goal.completed_reviews || 0) / goal.total_reviews) * 100);
	}

	function isOverdue(): boolean {
		if (goal.status === 'completed') return false;
		return new Date(goal.due_date) < new Date();
	}
</script>

<div class="bg-gray-50 border rounded-lg p-4" style="border-left: 4px solid {goal.color}">
	<div class="flex items-start justify-between">
		<div class="flex-1">
			<div class="flex items-center gap-2 mb-1">
				<span class="text-xs font-medium text-gray-500">関連プロジェクト</span>
				<span class="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
					{statusLabels[goal.status]}
				</span>
				{#if isOverdue()}
					<span class="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">
						期限超過
					</span>
				{/if}
			</div>
			<a
				href="/goals/{goal.id}"
				class="text-lg font-semibold text-gray-900 hover:text-blue-600 hover:underline"
			>
				{goal.title}
			</a>
			<div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
				<span class="flex items-center gap-1">
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
					</svg>
					期限: {formatDate(goal.due_date)}
				</span>
			</div>
		</div>
		<div class="ml-4 text-right">
			{#if goal.total_reviews !== undefined}
				<div class="text-2xl font-bold" style="color: {goal.color}">{getProgress()}%</div>
				<div class="text-xs text-gray-500">{goal.completed_reviews}/{goal.total_reviews} レビュー</div>
				<div class="w-24 h-2 bg-gray-200 rounded-full mt-1">
					<div
						class="h-2 rounded-full"
						style="width: {getProgress()}%; background-color: {goal.color}"
					></div>
				</div>
			{/if}
			{#if showRemove && onRemove}
				<button
					type="button"
					class="mt-2 text-xs text-gray-400 hover:text-red-500"
					onclick={onRemove}
				>
					削除
				</button>
			{/if}
		</div>
	</div>
</div>
