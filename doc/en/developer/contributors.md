## Contributor's Guide

### Version Numbering
Version numbering uses [Semantic Versioning](http://semver.org/).

In a nutshell, use version numbers like `major.minor.revision`: Increment the major revision number when there's a reverse-incompatible change; the minor revision number when there's a new feature that something else could possibly depend on; and revision for bugfixes or other changes. A string identifying a pre-release version may be appended, versions with these are compared by their lexicographic ASCII sort order (`1.0.0beta1` < `1.0.0beta2` < `1.0.0`). A major revision of zero signifies a very unstable API, try and move to version 1 as quickly as possible, as a version of zero prevents people from integrating with your software.

### Revision Control
Magnode uses Git.

Commits should be written in the present tense, with a title line, optionally followed by a blank line and then an extended body. If you must refer to another commit, use the full commit Id. Avoid referring to bug Ids, instead, describe the bug in the commit. If you must refer to a bug, provide the full URL to the issue page.

The Git repository is supposed to include such features that make it work out-of-the-box for a variety of use cases, but not much else. There only needs to be support for a memory database and maybe one common RDF store.

### Documentation
Documentation for Magnode is kept with the code in revision control, and should be maintained along with it. There's a whole section on how to do this, see [Metadocumentation](#meta).
