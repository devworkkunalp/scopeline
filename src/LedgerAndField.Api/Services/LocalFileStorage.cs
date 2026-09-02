namespace LedgerAndField.Api.Services;

public interface IFileStorage
{
    Task<string> SaveAsync(Guid projectId, string fileName, Stream content, CancellationToken ct = default);
    Task<Stream?> OpenReadAsync(string storagePath, CancellationToken ct = default);
}

public class LocalFileStorage(IWebHostEnvironment env, IConfiguration config) : IFileStorage
{
    public async Task<string> SaveAsync(Guid projectId, string fileName, Stream content, CancellationToken ct = default)
    {
        var root = config["Storage:LocalPath"] ?? "App_Data/uploads";
        if (!Path.IsPathRooted(root))
            root = Path.Combine(env.ContentRootPath, root);

        var dir = Path.Combine(root, projectId.ToString());
        Directory.CreateDirectory(dir);
        var safe = Path.GetFileName(fileName);
        var stored = $"{Guid.NewGuid():N}_{safe}";
        var path = Path.Combine(dir, stored);
        await using var fs = File.Create(path);
        await content.CopyToAsync(fs, ct);
        return path;
    }

    public Task<Stream?> OpenReadAsync(string storagePath, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(storagePath) || !File.Exists(storagePath))
            return Task.FromResult<Stream?>(null);
        return Task.FromResult<Stream?>(File.OpenRead(storagePath));
    }
}
