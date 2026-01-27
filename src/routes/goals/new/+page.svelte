<script lang="ts">
	import AppLayout from '$lib/components/AppLayout.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

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

	let selectedColor = $state('#3b82f6');

	function getTomorrowDate(): string {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		return tomorrow.toISOString().split('T')[0];
	}
</script>

<AppLayout user={data.user}>
	<div class="max-w-2xl mx-auto px-4 sm:px-0">
		<div class="mb-6">
			<a href="/goals" class="text-blue-600 hover:underline text-sm">
				&larr; プロジェクト一覧に戻る
			</a>
		</div>

		<h1 class="text-2xl font-bold text-gray-900 mb-6">新規プロジェクト作成</h1>

		{#if form?.error}
			<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
				{form.error}
			</div>
		{/if}

		<form method="POST" class="bg-white shadow rounded-lg p-6 space-y-6">
			<div>
				<label for="title" class="block text-sm font-medium text-gray-700 mb-1">
					タイトル <span class="text-red-500">*</span>
				</label>
				<input
					type="text"
					id="title"
					name="title"
					required
					class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
					placeholder="例: YouTube動画投稿、LP公開"
				/>
			</div>

			<div>
				<label for="description" class="block text-sm font-medium text-gray-700 mb-1">
					説明
				</label>
				<textarea
					id="description"
					name="description"
					rows="3"
					class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
					placeholder="目標の詳細説明..."
				></textarea>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="due_date" class="block text-sm font-medium text-gray-700 mb-1">
						期限 <span class="text-red-500">*</span>
					</label>
					<input
						type="date"
						id="due_date"
						name="due_date"
						required
						value={getTomorrowDate()}
						class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>

				<div>
					<label for="priority" class="block text-sm font-medium text-gray-700 mb-1">
						優先度
					</label>
					<select
						id="priority"
						name="priority"
						class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
					>
						<option value="low">低</option>
						<option value="medium" selected>中</option>
						<option value="high">高</option>
					</select>
				</div>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					カラー
				</label>
				<div class="flex gap-2">
					{#each colors as color}
						<label class="cursor-pointer">
							<input
								type="radio"
								name="color"
								value={color.value}
								class="sr-only"
								checked={selectedColor === color.value}
								onchange={() => selectedColor = color.value}
							/>
							<div
								class="w-8 h-8 rounded-full border-2 transition-all {selectedColor === color.value ? 'border-gray-900 scale-110' : 'border-transparent'}"
								style="background-color: {color.value}"
								title={color.name}
							></div>
						</label>
					{/each}
				</div>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					担当者
				</label>
				<div class="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
					{#each data.users as user}
						<label class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
							<input
								type="checkbox"
								name="assignees"
								value={user.id}
								class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
							/>
							<span class="text-sm">{user.name}</span>
							<span class="text-xs text-gray-500">({user.email})</span>
						</label>
					{/each}
				</div>
			</div>

			<div class="flex justify-end gap-3 pt-4 border-t">
				<a
					href="/goals"
					class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
				>
					キャンセル
				</a>
				<button
					type="submit"
					class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
				>
					作成
				</button>
			</div>
		</form>
	</div>
</AppLayout>
