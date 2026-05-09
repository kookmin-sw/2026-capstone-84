import yaml

def cf_constructor(loader, tag_suffix, node):
    if isinstance(node, yaml.ScalarNode):
        return loader.construct_scalar(node)
    elif isinstance(node, yaml.SequenceNode):
        return loader.construct_sequence(node)
    elif isinstance(node, yaml.MappingNode):
        return loader.construct_mapping(node)

yaml.add_multi_constructor('!', cf_constructor, Loader=yaml.SafeLoader)

with open('2026-capstone-84/infra/templates/redis.yaml', encoding='utf-8') as f:
    doc = yaml.safe_load(f)

assert 'AWSTemplateFormatVersion' in doc
assert 'Parameters' in doc
assert 'Resources' in doc
assert 'Outputs' in doc
assert 'EnvironmentName' in doc['Parameters']
assert 'CacheNodeType' in doc['Parameters']
assert 'AuthToken' in doc['Parameters']
assert 'RedisSubnetGroup' in doc['Resources']
assert 'RedisParameterGroup' in doc['Resources']
assert 'RedisReplicationGroup' in doc['Resources']
assert 'RedisPrimaryEndpoint' in doc['Outputs']
assert 'RedisReaderEndpoint' in doc['Outputs']
assert 'RedisPort' in doc['Outputs']

# Check AuthToken has NoEcho
assert doc['Parameters']['AuthToken'].get('NoEcho') == True

# Check CacheNodeType default
assert doc['Parameters']['CacheNodeType'].get('Default') == 'cache.r6g.large'

print('All validations passed!')
print('Parameters:', list(doc['Parameters'].keys()))
print('Resources:', list(doc['Resources'].keys()))
print('Outputs:', list(doc['Outputs'].keys()))
