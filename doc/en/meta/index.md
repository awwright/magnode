## Metadocumentation
Metadocumentation is documentation about documentation. So, this document describes how the documentation system works.

The goal right from the very start was to have excellent documentation. It's hard enough to have to grapple with new design paradigms, nevermind underdocumented function calls that work differently than one might expect. So throughly documenting the project is critical. It's just as critical to generate accessible, navigable documentation, hence the the documentation _gets it's own section_ on how to write documentation.

The Magnode documentation is shipped with the repository. It's split up into sections with different goals, or even different ways of being defined. For instance, the API documentation is generated from the source code itself. The rest of the sections are stored in the `doc/` directory.

The documentation is formatted with one file per module and chapter. The index is generated first, which lists the sub-sections:

 * Introduction
 * About
 * Design
 * Installation
 * User Guide
 * Developer Guide
 * API Reference
 * Metadocumentation
