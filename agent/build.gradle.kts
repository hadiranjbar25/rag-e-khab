plugins {
    kotlin("jvm")
    application
}

group = "com.ragekhab"
version = "0.1.0"

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(25))
    }
}

kotlin {
    jvmToolchain(25)
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

application {
    mainClass.set("com.ragekhab.agent.RepositoryAgentCliKt")
}

tasks.jar {
    archiveFileName.set("ragekhab-agent.jar")
    manifest {
        attributes["Main-Class"] = application.mainClass.get()
    }
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    from(configurations.runtimeClasspath.get().map { if (it.isDirectory) it else zipTree(it) })
}

tasks.withType<JavaCompile> {
    options.release.set(17)
}
