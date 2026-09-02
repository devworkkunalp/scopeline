using LedgerAndField.Api.Data;
using LedgerAndField.Api.Dtos;
using LedgerAndField.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LedgerAndField.Api.Controllers;

[Authorize]
[ApiController]
public class JobsController(AppDbContext db) : ControllerBase
{
    private Guid WorkspaceId => TokenService.WorkspaceId(User);

    [HttpGet("jobs/{id:guid}")]
    [HttpGet("api/jobs/{id:guid}")]
    public async Task<IActionResult> GetJob(Guid id)
    {
        var job = await db.AsyncJobs
            .Include(j => j.Project)
            .FirstOrDefaultAsync(j => j.Id == id && j.Project.WorkspaceId == WorkspaceId);
        if (job is null) return NotFound();

        return Ok(Mapper.AsyncJob(job));
    }
}
