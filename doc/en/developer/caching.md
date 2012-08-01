## Caching
Caching can be done on Nginx.

Additional resource-level caching can be done based on a transform's domain and values of ancestor inputs. This means based on the resource provided and the output type requested, each stage of the transform process can be cached.

Resource level caching is not only more efficent with respect to processing, but is necessary for _mutable_ transforms: transforms that modify other systems or resources, for instance, writing to the HTTP stream or creating a new Javascript object as an output.
