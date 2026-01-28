<script lang="ts">
	import AppLayout from '$lib/components/AppLayout.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let title = $state('');
	let titleEmoji = $state('📄');
	let showEmojiPicker = $state(false);
	let selectedGoalId = $state(data.preselectedGoalId || '');
	let description = $state('');

	const emojis = [
		'📄', '📝', '📋', '📌', '📎', '🎯', '🎬', '🎥', '📺', '🎵',
		'💡', '⭐', '🔥', '✨', '💫', '🚀', '💪', '👍', '✅', '❌',
		'⚠️', '📢', '💬', '📊', '📈', '📉', '🗂️', '📁', '🔗', '🌐'
	];
</script>

<AppLayout user={data.user}>
	<div class="max-w-3xl mx-auto px-4">
		<div class="mb-4">
			<a href="/reviews" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
				ドキュメント一覧に戻る
			</a>
		</div>

		{#if form?.error}
			<div class="mb-6 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
				{form.error}
			</div>
		{/if}

		<form method="POST">
			<input type="hidden" name="emoji" value={titleEmoji} />
			<input type="hidden" name="goal_id" value={selectedGoalId} />
			<input type="hidden" name="description" value={description} />

			<div class="bg-white rounded-2xl shadow-xl border border-slate-200/50">
				<!-- Header -->
				<div class="px-6 sm:px-8 pt-6 sm:pt-8 pb-4">
					<div class="flex items-start gap-4">
						<div class="relative">
							<button type="button" onclick={() => showEmojiPicker = !showEmojiPicker} class="w-16 h-16 bg-slate-100 hover:bg-slate-200 rounded-2xl flex items-center justify-center text-4xl shrink-0 transition-colors cursor-pointer border-2 border-dashed border-transparent hover:border-blue-300">
								{titleEmoji}
							</button>
							{#if showEmojiPicker}
								<div class="absolute top-18 left-0 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-50 w-80">
									<div class="grid grid-cols-10 gap-1">
										{#each emojis as emoji}
											<button type="button" onclick={() => { titleEmoji = emoji; showEmojiPicker = false; }} class="w-8 h-8 flex items-center justify-center text-xl hover:bg-slate-100 rounded transition-colors">
												{emoji}
											</button>
										{/each}
									</div>
								</div>
							{/if}
						</div>
						<div class="flex-1">
							<input type="text" name="title" bind:value={title} placeholder="無題" required class="w-full text-2xl sm:text-3xl font-bold text-slate-900 bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-slate-300 mb-2" />
							<span class="px-3 py-1.5 text-sm font-medium rounded-full bg-blue-100 text-blue-700">新規作成</span>
						</div>
					</div>
				</div>

				<!-- Project Selector -->
				{#if data.goals && data.goals.length > 0}
					<div class="px-6 sm:px-8 pb-4">
						<div class="flex items-center gap-2 flex-wrap">
							<svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
							</svg>
							{#each data.goals as goal}
								<button type="button" onclick={() => selectedGoalId = selectedGoalId === goal.id ? '' : goal.id}
									class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm transition-colors {selectedGoalId === goal.id ? 'ring-2 ring-offset-1 font-medium' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
									style={selectedGoalId === goal.id ? `background-color: ${goal.color}20; color: ${goal.color}; --tw-ring-color: ${goal.color}` : ''}>
									<span class="w-2 h-2 rounded-full shrink-0" style="background-color: {goal.color}"></span>
									{goal.title}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<div class="mx-6 sm:mx-8 my-4 border-t border-slate-200"></div>

				<!-- Content Editor -->
				<div class="px-6 sm:px-8 py-4">
					<textarea
						bind:value={description}
						rows="15"
						placeholder="内容を入力..."
						class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none text-slate-700 text-base leading-relaxed"
					></textarea>
				</div>

				<!-- Footer -->
				<div class="px-6 sm:px-8 py-6 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex justify-end gap-3">
					<a href="/reviews" class="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg">キャンセル</a>
					<button type="submit" class="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">保存</button>
				</div>
			</div>
		</form>
	</div>
</AppLayout>
