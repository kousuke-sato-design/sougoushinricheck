<script lang="ts">
	import '../app.css';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();
</script>

<svelte:head>
	<title>社内レビュー管理システム</title>
	<meta name="description" content="社内成果物のレビュー・チェックを管理するシステム" />
</svelte:head>

{@render children()}
