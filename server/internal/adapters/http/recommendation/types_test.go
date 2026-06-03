package recommendation

import "testing"

func TestPaginateTreeResponseKeepsSectionContext(t *testing.T) {
	response := treeResponse{
		Items: []sectionDTO{
			{
				ID:     "section-1",
				Number: "1",
				Title:  "Root",
				Blocks: []blockDTO{
					{ID: "block-1", Title: "One"},
					{ID: "block-2", Title: "Two"},
				},
				Children: []sectionDTO{
					{
						ID:     "section-2",
						Number: "1.1",
						Title:  "Child",
						Blocks: []blockDTO{{ID: "block-3", Title: "Three"}},
					},
				},
			},
		},
	}

	page := paginateTreeResponse(response, 2, 2)

	if page.Page != 2 || page.PageCount != 3 || page.TotalBlocks != 5 {
		t.Fatalf("unexpected page meta: page=%d pageCount=%d total=%d", page.Page, page.PageCount, page.TotalBlocks)
	}
	if page.StartBlock != 3 || page.EndBlock != 4 {
		t.Fatalf("unexpected page range: %d-%d", page.StartBlock, page.EndBlock)
	}
	if len(page.Items) != 1 {
		t.Fatalf("expected root section to stay visible, got %d sections", len(page.Items))
	}

	root := page.Items[0]
	if len(root.Blocks) != 1 || root.Blocks[0].ID != "block-2" {
		t.Fatalf("expected only block-2 in root, got %#v", root.Blocks)
	}
	if len(root.Children) != 1 || root.Children[0].ID != "section-2" {
		t.Fatalf("expected child section context, got %#v", root.Children)
	}
	if len(root.Children[0].Blocks) != 0 {
		t.Fatalf("expected child section without hidden blocks, got %#v", root.Children[0].Blocks)
	}
}

func TestPaginateTreeResponseClampsPage(t *testing.T) {
	response := treeResponse{
		Items: []sectionDTO{{ID: "section-1", Blocks: []blockDTO{{ID: "block-1"}}}},
	}

	page := paginateTreeResponse(response, 99, 10)

	if page.Page != 1 || page.PageCount != 1 || page.TotalBlocks != 2 {
		t.Fatalf("unexpected clamped page meta: page=%d pageCount=%d total=%d", page.Page, page.PageCount, page.TotalBlocks)
	}
}

func TestPaginateTreeResponseUsesDefaultTwentyPerPage(t *testing.T) {
	blocks := make([]blockDTO, 19)
	for i := range blocks {
		blocks[i] = blockDTO{ID: "block"}
	}
	response := treeResponse{
		Items: []sectionDTO{{ID: "section-1", Blocks: blocks}},
	}

	page := paginateTreeResponse(response, 1, 0)

	if page.PerPage != 20 || page.PageCount != 1 || page.EndBlock != 20 {
		t.Fatalf("expected default page size 20, got perPage=%d pageCount=%d endBlock=%d", page.PerPage, page.PageCount, page.EndBlock)
	}
}

func TestEncodeBlockTextStoresStructuredJSONAndParsesBack(t *testing.T) {
	raw := encodeBlockText(blockRequest{
		Title:   "Дыхательная пауза",
		Content: "Сделайте 5 спокойных вдохов перед сном.",
	})

	if raw != `{"title":"Дыхательная пауза","content":"Сделайте 5 спокойных вдохов перед сном."}` {
		t.Fatalf("unexpected raw text: %q", raw)
	}

	block := parseBlockText("block-1", raw)
	if block.Title != "Дыхательная пауза" || block.Content != "Сделайте 5 спокойных вдохов перед сном." {
		t.Fatalf("unexpected parsed block: %#v", block)
	}
}

func TestParseBlockTextKeepsUntitledJSONContentInBody(t *testing.T) {
	raw := `{"title":"","content":"Три задачи на ближайшее время:\n1) Снизить остроту боли.\n2) Не усугублять рану."}`

	block := parseBlockText("block-1", raw)

	if block.Title != "" {
		t.Fatalf("unexpected title: %q", block.Title)
	}
	if block.Content != "Три задачи на ближайшее время:\n1) Снизить остроту боли.\n2) Не усугублять рану." {
		t.Fatalf("unexpected content: %q", block.Content)
	}
}

func TestParseBlockTextKeepsNumberedFirstItemOutOfPlainTitle(t *testing.T) {
	raw := "Три задачи на ближайшее время. 1) Снизить остроту боли.\n2) Не усугублять рану."

	block := parseBlockText("block-1", raw)

	if block.Title != "Три задачи на ближайшее время" {
		t.Fatalf("unexpected title: %q", block.Title)
	}
	if block.Content != "1) Снизить остроту боли.\n2) Не усугублять рану." {
		t.Fatalf("unexpected content: %q", block.Content)
	}
}
