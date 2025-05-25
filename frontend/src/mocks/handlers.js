import { http, HttpResponse } from 'msw';

// Define a base URL for your API, if you have one, or use full paths
const API_BASE_URL = '/api'; // Matches the default in apiClient.js

export const handlers = [
  // Example: Mock for login
  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const { email } = await request.json();
    if (email === 'test@example.com') {
      return HttpResponse.json({ access_token: 'mocked_access_token' });
    } else if (email === 'fail@example.com') {
        return HttpResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }
    return HttpResponse.json({ message: 'User not found' }, { status: 404 });
  }),

  // Example: Mock for registration
  http.post(`${API_BASE_URL}/auth/register`, async ({ request }) => {
    const { email } = await request.json();
    if (email === 'existing@example.com') {
      return HttpResponse.json({ message: 'Email already exists' }, { status: 409 });
    }
    return HttpResponse.json({ message: 'User registered successfully' }, { status: 201 });
  }),
  
  // Mock for fetching projects on HomePage
  http.get(`${API_BASE_URL}/projects`, () => {
    return HttpResponse.json([
      { id: 1, name: 'Project Alpha', description: 'Description for Alpha', created_at: new Date().toISOString(), stages: [] },
      { id: 2, name: 'Project Beta', description: 'Description for Beta', created_at: new Date().toISOString(), stages: [] },
    ]);
  }),

  // Mock for fetching a single project's details (ProjectViewPage)
  // This will need to be more dynamic or specific for different test scenarios
  http.get(`${API_BASE_URL}/projects/:projectId`, ({ params }) => {
    const { projectId } = params;
    if (projectId === '1') {
      return HttpResponse.json({
        id: 1,
        name: 'Project Alpha',
        description: 'Description for Alpha',
        created_at: new Date().toISOString(),
        stages: [
          { 
            id: 1, name: 'To Do', project_id: 1, order: 0, created_at: new Date().toISOString(), 
            tasks: [
              { id: 1, content: 'Task 1 for Alpha', stage_id: 1, due_date: null, priority: 'Medium', order: 0, tags: [{id: 1, name: "Urgent"}] },
              { id: 2, content: 'Task 2 for Alpha', stage_id: 1, due_date: '2023-12-31T00:00:00.000Z', priority: 'High', order: 1, tags: [] },
            ]
          },
          { 
            id: 2, name: 'In Progress', project_id: 1, order: 1, created_at: new Date().toISOString(),
            tasks: [
              { id: 3, content: 'Task 3 for Alpha', stage_id: 2, due_date: '2024-01-15T00:00:00.000Z', priority: 'Low', order: 0, tags: [] },
            ]
          },
        ],
      });
    }
    if (projectId === 'project-error') {
        return HttpResponse.json({ message: 'Failed to fetch project (mocked error)' }, { status: 500 });
    }
    return HttpResponse.json({ message: 'Project not found' }, { status: 404 });
  }),

  // Mock for creating a task
  http.post(`${API_BASE_URL}/stages/:stageId/tasks`, async ({ request, params }) => {
    const { stageId } = params;
    const taskData = await request.json();
    return HttpResponse.json({
      id: Date.now(), // Mock new task ID
      stage_id: parseInt(stageId),
      ...taskData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: [], // New tasks usually have no tags initially
      subtasks: [],
    }, { status: 201 });
  }),
  
  // Mock for updating a task
  http.put(`${API_BASE_URL}/tasks/:taskId`, async ({ request, params }) => {
    const { taskId } = params;
    const taskData = await request.json();
    return HttpResponse.json({
      id: parseInt(taskId),
      ...taskData, // Echo back the updated data, potentially merged with existing server state
      updated_at: new Date().toISOString(),
    });
  }),

  // Mock for fetching comments
  http.get(`${API_BASE_URL}/tasks/:taskId/comments`, ({ params }) => {
    const { taskId } = params;
    if (taskId === '1') { // Task 1 has comments
        return HttpResponse.json([
            { id: 1, content: 'First comment on task 1', task_id: 1, user_id: 1, commenter_username: 'UserAlpha', created_at: new Date().toISOString() },
            { id: 2, content: 'Second comment on task 1', task_id: 1, user_id: 2, commenter_username: 'UserBeta', created_at: new Date().toISOString() },
        ]);
    }
    return HttpResponse.json([]); // Default to no comments
  }),

  // Mock for adding a comment
  http.post(`${API_BASE_URL}/tasks/:taskId/comments`, async ({ request, params }) => {
    const { taskId } = params;
    const { content } = await request.json();
    // Assume user_id 1 and username 'CurrentUser' for simplicity in mock
    return HttpResponse.json({ 
        id: Date.now(), 
        content, 
        task_id: parseInt(taskId), 
        user_id: 1, 
        commenter_username: 'CurrentUser', 
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }, { status: 201 });
  }),

  // Mock for fetching task activities
  http.get(`${API_BASE_URL}/tasks/:taskId/activities`, ({ params }) => {
    const { taskId } = params;
    return HttpResponse.json([
        { id: 1, action_type: 'TASK_CREATED', description: `Task ${taskId} created by TestUser`, user_id: 1, user_username: 'TestUser', task_id: parseInt(taskId), created_at: new Date().toISOString() },
        { id: 2, action_type: 'COMMENT_ADDED', description: `TestUser commented on Task ${taskId}`, user_id: 1, user_username: 'TestUser', task_id: parseInt(taskId), created_at: new Date().toISOString() },
    ]);
  }),

  // Mock for fetching project activities
  http.get(`${API_BASE_URL}/projects/:projectId/activities`, ({ params }) => {
    const { projectId } = params;
     return HttpResponse.json([
        { id: 1, action_type: 'PROJECT_CREATED', description: `Project ${projectId} created by TestUser`, user_id: 1, user_username: 'TestUser', project_id: parseInt(projectId), created_at: new Date().toISOString() },
    ]);
  }),

  // Mock for fetching all tags
  http.get(`${API_BASE_URL}/tags`, () => {
    return HttpResponse.json([
        { id: 1, name: 'Urgent' },
        { id: 2, name: 'Backend' },
        { id: 3, name: 'Frontend' },
    ]);
  }),

  // Mock for adding a tag to a task
  http.post(`${API_BASE_URL}/tasks/:taskId/tags`, async ({ request, params }) => {
    const { taskId } = params;
    const { tag_name, tag_id } = await request.json();
    // This mock needs to return the full task object with updated tags
    // For simplicity, we'll just return a success message or a simplified task
    // A more complete mock would fetch the task, add the tag, then return it.
    let newTag;
    if (tag_id) newTag = { id: tag_id, name: "ExistingTagNameMock" }; // Assume it exists
    else newTag = { id: Date.now(), name: tag_name };
    
    // This should ideally return the full task object with all its properties and the *updated* tags array.
    // For now, just echo back something simple. Test will need to mock this more specifically if needed.
    return HttpResponse.json({
        id: parseInt(taskId),
        content: "Mocked task content after tag add",
        tags: [newTag] // This is simplified; should be list of all tags on task
    });
  }),

  // Mock for removing a tag from a task
  http.delete(`${API_BASE_URL}/tasks/:taskId/tags/:tagId`, () => {
    return new HttpResponse(null, { status: 204 }); // No content
  }),

  // Mock for creating a project
  http.post(`${API_BASE_URL}/projects`, async ({ request }) => {
    const data = await request.json();
    return HttpResponse.json({
      id: Date.now(), // Mock new project ID
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      stages: [],
      user_id: 1 // Mock user ID
    }, { status: 201 });
  }),

  // Add other handlers as needed...
];
