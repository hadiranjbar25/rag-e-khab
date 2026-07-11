package com.ragekhab.repository

import com.ragekhab.config.RagEKhabProperties
import com.ragekhab.config.RuntimeSettingsService
import com.ragekhab.document.Chunker
import com.ragekhab.document.DocumentChunk
import com.ragekhab.document.DocumentFormat
import com.ragekhab.document.DocumentRepository
import com.ragekhab.document.KnowledgeDocument
import com.ragekhab.project.ProjectRepository
import com.ragekhab.project.ProjectService
import com.ragekhab.search.SearchResult
import com.ragekhab.search.VectorIndex
import com.ragekhab.testStateStore
import java.nio.file.Files
import java.time.Instant
import java.util.UUID
import kotlin.io.path.writeText
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class RepositoryContextBuilderTest {
    @Test
    fun `relevance ranking puts task-matching supplier classes first`() {
        val fixture = contextFixture()

        val result = fixture.service.buildContextPackage(
            ContextRequest(repoId = "supplier-service", task = "Add validation for supplier tax ID", maxTokens = 6_000),
        )

        val classNames = result.relevantClasses.map { it.className }
        assertTrue(classNames.indexOf("SupplierService") in 0..1)
        assertTrue(classNames.indexOf("SupplierValidator") in 0..2)
        assertTrue(result.debug.any { it.file.endsWith("SupplierService.java") && "has related test" in it.reason })
    }

    @Test
    fun `token budget trims lower priority context before raw source`() {
        val fixture = contextFixture()

        val result = fixture.service.buildContextPackage(
            ContextRequest(
                repoId = "supplier-service",
                task = "Add validation for supplier tax ID",
                maxTokens = 700,
                includeRawSource = false,
            ),
        )

        assertTrue(result.relevantClasses.isNotEmpty())
        assertTrue(result.estimatedTokens <= 700)
        assertTrue(result.sourceSnippets.isEmpty())
    }

    @Test
    fun `dependency chains are generated from imports and references`() {
        val fixture = contextFixture()

        val result = fixture.service.buildContextPackage(
            ContextRequest(repoId = "supplier-service", task = "Supplier service validation", maxTokens = 6_000),
        )

        assertTrue(result.dependencyChains.any { it == "SupplierService -> SupplierRepository" })
        assertTrue(result.dependencyChains.any { it == "SupplierService -> SupplierValidator" })
    }

    @Test
    fun `related tests are attached to production classes`() {
        val fixture = contextFixture()

        val result = fixture.service.buildContextPackage(
            ContextRequest(repoId = "supplier-service", task = "SupplierService create supplier", maxTokens = 6_000),
        )

        val serviceTests = result.relatedTests.first { it.className == "SupplierService" }.tests
        assertEquals("SupplierServiceTest", serviceTests.single().name)
        assertTrue("createSupplier" in serviceTests.single().covers)
    }

    @Test
    fun `source snippet can be extracted by class and method`() {
        val fixture = contextFixture()

        val result = fixture.service.buildContextPackage(
            ContextRequest(
                repoId = "supplier-service",
                task = "Inspect create supplier",
                maxTokens = 6_000,
                includeRawSource = true,
                className = "SupplierService",
                method = "createSupplier",
            ),
        )

        val snippet = result.sourceSnippets.single()
        assertEquals("src/main/java/com/example/supplier/SupplierService.java", snippet.filePath)
        assertTrue("createSupplier" in snippet.text)
        assertTrue("validator.validateTaxId" in snippet.text)
        assertFalse("updateSupplier" in snippet.text)
    }

    @Test
    fun `context summaries extract declarations and functions for more languages`() {
        val fixture = multiLanguageFixture()

        val result = fixture.service.buildContextPackage(
            ContextRequest(repoId = "polyglot-service", task = "render invoice validation and sync", maxTokens = 6_000),
        )

        val summaries = result.relevantClasses.associateBy { it.className }
        assertTrue("InvoiceService" in summaries)
        assertTrue("InvoiceAnalyzer" in summaries)
        assertTrue("SyncInvoice" in summaries)
        assertTrue("validate_invoice" in summaries)
        assertTrue("renderInvoice" in summaries.getValue("InvoiceService").publicMethods)
        assertTrue("normalizeInvoice" in summaries.getValue("InvoiceService").publicMethods)
        assertTrue("analyze_invoice" in summaries.getValue("InvoiceAnalyzer").publicMethods)
        assertTrue("SyncInvoice" in summaries.getValue("SyncInvoice").publicMethods)
        assertTrue("validate_invoice" in summaries.getValue("validate_invoice").publicMethods)
    }

    @Test
    fun `source snippet can be extracted for python functions`() {
        val fixture = multiLanguageFixture()

        val result = fixture.service.buildContextPackage(
            ContextRequest(
                repoId = "polyglot-service",
                task = "Inspect invoice analyzer",
                maxTokens = 6_000,
                includeRawSource = true,
                className = "InvoiceAnalyzer",
                method = "analyze_invoice",
            ),
        )

        val snippet = result.sourceSnippets.single()
        assertEquals("services/invoice_analyzer.py", snippet.filePath)
        assertTrue("analyze_invoice" in snippet.text)
        assertFalse("helper_not_requested" in snippet.text)
    }

    @Test
    fun `repository scan is incremental for unchanged changed and deleted files`() {
        val state = testStateStore()
        val documentRepository = DocumentRepository(state)
        val vectorIndex = FakeVectorIndex()
        val projectService = ProjectService(ProjectRepository(state), documentRepository)
        val root = Files.createTempDirectory("ragekhab-repo-agent-test")
        val service = RepositoryAgentService(
            settingsService = RuntimeSettingsService(RagEKhabProperties(), state),
            metadataStore = RepositoryMetadataStore(state),
            repositoryCatalog = RepositoryCatalogStore(state),
            chunker = Chunker(),
            documentRepository = documentRepository,
            vectorIndex = vectorIndex,
            projectService = projectService,
        )
        val serviceFile = root.resolve("src/main/java/SupplierService.java")
        val validatorFile = root.resolve("src/main/java/SupplierValidator.java")
        Files.createDirectories(serviceFile.parent)
        serviceFile.writeText("class SupplierService { void createSupplier() {} }")
        validatorFile.writeText("class SupplierValidator { void validateTaxId() {} }")

        val first = service.scan(RepositoryScanRequest(repository = "supplier-service", path = root.toString(), full = true))
        val unchanged = service.scan(RepositoryScanRequest(repository = "supplier-service", path = root.toString(), full = false))
        serviceFile.writeText("class SupplierService { void createSupplier() {} void updateSupplier() {} }")
        val changed = service.scan(RepositoryScanRequest(repository = "supplier-service", path = root.toString(), full = false))
        Files.delete(validatorFile)
        val deleted = service.scan(RepositoryScanRequest(repository = "supplier-service", path = root.toString(), full = false))

        assertEquals(2, first.indexedFiles)
        assertEquals(2, unchanged.unchangedFiles)
        assertEquals(1, changed.indexedFiles)
        assertEquals(1, changed.unchangedFiles)
        assertEquals(1, deleted.deletedFiles)
        assertTrue(vectorIndex.deletedDocuments.isNotEmpty())
    }

    private fun contextFixture(): ContextFixture {
        val state = testStateStore()
        val metadataStore = RepositoryMetadataStore(state)
        val documentRepository = DocumentRepository(state)
        val memoryStore = RepositoryMemoryStore(state)
        val service = RepositoryContextBuilder(
            metadataStore,
            documentRepository,
            memoryStore,
            SourceSymbolExtractor(),
            SourceSnippetCompressor(),
        )
        listOf(
            "src/main/java/com/example/supplier/SupplierController.java" to """
                package com.example.supplier;
                import org.springframework.web.bind.annotation.RestController;
                @RestController
                public class SupplierController {
                    private final SupplierService service;
                    public SupplierResponse createSupplier(SupplierRequest request) {
                        return service.createSupplier(request);
                    }
                }
            """.trimIndent(),
            "src/main/java/com/example/supplier/SupplierService.java" to """
                package com.example.supplier;
                import org.springframework.stereotype.Service;
                @Service
                public class SupplierService {
                    private final SupplierRepository repository;
                    private final SupplierValidator validator;
                    public SupplierResponse createSupplier(SupplierRequest request) {
                        validator.validateTaxId(request.taxId());
                        return repository.save(request);
                    }
                    public SupplierResponse updateSupplier(SupplierRequest request) {
                        validator.validateTaxId(request.taxId());
                        return repository.save(request);
                    }
                }
            """.trimIndent(),
            "src/main/java/com/example/supplier/SupplierValidator.java" to """
                package com.example.supplier;
                public class SupplierValidator {
                    public void validateTaxId(String taxId) {
                        if (taxId == null || taxId.isBlank()) throw new IllegalArgumentException("tax ID required");
                    }
                }
            """.trimIndent(),
            "src/main/java/com/example/supplier/SupplierRepository.java" to """
                package com.example.supplier;
                public interface SupplierRepository {
                    SupplierResponse save(SupplierRequest request);
                }
            """.trimIndent(),
            "src/test/java/com/example/supplier/SupplierServiceTest.java" to """
                package com.example.supplier;
                class SupplierServiceTest {
                    void createSupplier_validatesTaxId() {
                        service.createSupplier(request);
                    }
                }
            """.trimIndent(),
        ).forEach { (path, source) ->
            saveRepoFile(metadataStore, documentRepository, path, source)
        }
        return ContextFixture(service)
    }

    private fun multiLanguageFixture(): ContextFixture {
        val state = testStateStore()
        val metadataStore = RepositoryMetadataStore(state)
        val documentRepository = DocumentRepository(state)
        val memoryStore = RepositoryMemoryStore(state)
        val service = RepositoryContextBuilder(
            metadataStore,
            documentRepository,
            memoryStore,
            SourceSymbolExtractor(),
            SourceSnippetCompressor(),
        )
        listOf(
            "frontend/src/invoice/InvoiceService.ts" to """
                export class InvoiceService {
                  renderInvoice(invoice: Invoice): string {
                    return this.normalizeInvoice(invoice).id;
                  }
                  private normalizeInvoice(invoice: Invoice): Invoice {
                    return invoice;
                  }
                }
                export const formatInvoice = (invoice: Invoice) => invoice.id;
            """.trimIndent(),
            "services/invoice_analyzer.py" to """
                class InvoiceAnalyzer:
                    def analyze_invoice(self, invoice):
                        return invoice.total

                    def helper_not_requested(self):
                        return "noise"
            """.trimIndent(),
            "cmd/invoice/sync.go" to """
                package invoice

                func SyncInvoice(invoice Invoice) error {
                    return nil
                }
            """.trimIndent(),
            "src/invoice_validator.rs" to """
                pub fn validate_invoice(invoice: Invoice) -> bool {
                    invoice.total > 0
                }
            """.trimIndent(),
        ).forEach { (path, source) ->
            saveRepoFile(metadataStore, documentRepository, path, source, repository = "polyglot-service")
        }
        return ContextFixture(service)
    }

    private fun saveRepoFile(
        metadataStore: RepositoryMetadataStore,
        documentRepository: DocumentRepository,
        path: String,
        source: String,
        repository: String = "supplier-service",
    ) {
        val documentId = UUID.nameUUIDFromBytes("$repository:$path".toByteArray())
        val now = Instant.parse("2026-07-05T12:00:00Z")
        metadataStore.save(
            RepositoryFileMetadata(
                documentId = documentId,
                repository = repository,
                repositoryRoot = "agent:$repository",
                filePath = path,
                module = path.split('/').first(),
                language = languageForPath(path),
                lastModifiedAt = now,
                sizeBytes = source.length.toLong(),
                contentHash = documentId.toString(),
                indexedAt = now,
            ),
        )
        documentRepository.save(
            KnowledgeDocument(
                id = documentId,
                projectId = ProjectRepository.DEFAULT_PROJECT_ID,
                projectName = ProjectRepository.DEFAULT_PROJECT_NAME,
                name = "$repository/$path",
                format = DocumentFormat.TEXT,
                contentType = "text/plain",
                sizeBytes = source.length.toLong(),
                createdAt = now,
                chunkCount = 1,
            ),
            listOf(
                DocumentChunk(
                    id = "$documentId:1",
                    projectId = ProjectRepository.DEFAULT_PROJECT_ID,
                    projectName = ProjectRepository.DEFAULT_PROJECT_NAME,
                    documentId = documentId,
                    documentName = "$repository/$path",
                    pageNumber = null,
                    text = source,
                ),
            ),
        )
    }

    private fun languageForPath(path: String): String =
        when (path.substringAfterLast('.', "")) {
            "kt", "kts" -> "kotlin"
            "java" -> "java"
            "js", "jsx" -> "javascript"
            "ts", "tsx" -> "typescript"
            "py" -> "python"
            "go" -> "go"
            "rs" -> "rust"
            else -> "text"
        }

    private data class ContextFixture(
        val service: RepositoryContextBuilder,
    )

    private class FakeVectorIndex : VectorIndex {
        val deletedDocuments = mutableListOf<UUID>()
        override fun upsert(chunks: List<DocumentChunk>) = Unit
        override fun search(query: String, limit: Int, projectId: UUID?): List<SearchResult> = emptyList()
        override fun deleteDocument(documentId: UUID) {
            deletedDocuments += documentId
        }
        override fun reindex(chunks: List<DocumentChunk>) = Unit
        override fun status(): String = "fake"
    }
}
