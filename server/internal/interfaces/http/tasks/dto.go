package tasks

type createTaskRequest struct {
	Title string `json:"title" binding:"required,min=2,max=120"`
}
