package tasks

type CreateTaskRequest struct {
	Title string `json:"title" binding:"required,min=2,max=120"`
}

type UpdateTaskRequest struct {
	Title *string `json:"title,omitempty" binding:"omitempty,min=2,max=120"`
	Done  *bool   `json:"done,omitempty"`
}

type TaskResponse struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Done      bool   `json:"done"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}
